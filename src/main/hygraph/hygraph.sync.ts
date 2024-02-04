import {
  BatchMigrationCreateComponentFieldInput,
  BatchMigrationCreateComponentInput,
  BatchMigrationCreateComponentUnionFieldInput,
  BatchMigrationCreateEnumerableFieldInput,
  BatchMigrationCreateEnumerationInput,
  BatchMigrationCreateModelInput,
  BatchMigrationCreateRelationalFieldInput,
  BatchMigrationCreateSimpleFieldInput,
  BatchMigrationCreateUnionFieldInput,
  Client,
  ComponentField,
  ComponentUnionField,
  EnumerableField,
  RelationalField,
  RelationalFieldType,
  SimpleField,
  SimpleFieldType,
  UniDirectionalRelationalField,
  UnionField,
} from '@hygraph/management-sdk';
import { Variables } from '../../renderer/src/contants';
import {
  FieldType,
  SyncListItem,
  dataStructure,
  getAllSchemas,
} from './hygraph.utils';

export class HygraphSync {
  projectInfo: Variables;
  syncList: SyncListItem[] = [];
  shareEnumerations: dataStructure['enumerations'] = [];
  shareModels: dataStructure['models'] = [];
  shareComponents: dataStructure['components'] = [];
  currentAddingApiIds: Record<string, boolean> = {};
  targetModels: dataStructure['models'] = [];
  targetComponents: dataStructure['components'] = [];
  mutationClinet: Client;

  constructor(projectInfo: Variables) {
    this.projectInfo = projectInfo;
    this.mutationClinet = new Client({
      authToken: this.projectInfo.TARGET_PROJECT.TOKEN,
      endpoint: 'https://api-ca-central-1.hygraph.com/v2/clq3fho2n9dbq01uhcfcj084h/master',
    })

    this.startSync(projectInfo);
  }

  async startSync({ SHARE_PROJECT, TARGET_PROJECT }: Variables) {
    const shareSchema = await getAllSchemas(SHARE_PROJECT);
    this.shareEnumerations = shareSchema.enumerations;
    this.shareModels = shareSchema.models;
    this.shareComponents = shareSchema.components;

    const targetSchema = await getAllSchemas(TARGET_PROJECT);
    this.targetModels = targetSchema.models;
    this.targetComponents = targetSchema.components;
    this.generateNeedSyncList(shareSchema);

    this.startMutation();
  }

  generateNeedSyncList(share: dataStructure) {
    const filterName = this.projectInfo.SHARE_PROJECT.MODEL_OR_COMPONENT_NAME;
    const models = share.models.filter(({ displayName }) =>
      displayName.includes(filterName),
    );
    const components = share.components.filter(({ displayName }) =>
      displayName.includes(filterName),
    );

    for (const model of models) {
      this.addModelToSyncList(
        {
          apiId: model.apiId,
          apiIdPlural: model.apiIdPlural,
          displayName: model.displayName,
        },
        model.fields,
      );
    }

    for (const component of components) {
      this.addComponentToSyncList(
        {
          apiId: component.apiId,
          apiIdPlural: component.apiIdPlural,
          displayName: component.displayName,
        },
        component.fields,
      );
    }
  }

  addModelToSyncList(
    data: BatchMigrationCreateModelInput,
    fields: FieldType[],
  ) {
    this.addModelOrComponentToSyncList(data, fields, 'model');
  }

  addComponentToSyncList(
    data: BatchMigrationCreateComponentInput,
    fields: FieldType[],
  ) {
    this.addModelOrComponentToSyncList(data, fields, 'component');
  }

  addModelOrComponentToSyncList(
    data: BatchMigrationCreateComponentInput | BatchMigrationCreateModelInput,
    fields: FieldType[],
    type: 'component' | 'model',
  ) {
    if (this.currentAddingApiIds[data.apiId]) {
      console.log(
        `This ${type} is being added, so this action will be ignored`,
      );
      return;
    }
    const targets =
      type === 'model' ? this.targetModels : this.targetComponents;
    let target = targets.find(({ apiId }) => data.apiId === apiId);
    if (!target) {
      this.syncList.push({
        actionType: type === 'model' ? 'createModel' : 'createComponent',
        data,
      });
      target = { ...data, fields: [] };
      targets.push(target);
    }

    this.addFieldsToList(fields, target?.fields || [], (field: FieldType) => {
      target?.fields.push(field);
    });
    delete this.currentAddingApiIds[data.apiId];
  }

  addEnumerationToSyncList(data: BatchMigrationCreateEnumerationInput) {
    let targetEnumeration = this.shareEnumerations.find(
      ({ apiId }) => data.apiId === apiId,
    );
    if (!targetEnumeration) {
      this.syncList.push({ actionType: 'createEnumeration', data });
      targetEnumeration = data;
      this.shareEnumerations.push(targetEnumeration);
    }
  }

  addFieldsToList(
    sFields: FieldType[],
    tFields: FieldType[],
    callback: (field: FieldType) => void,
  ) {
    for (const field of sFields) {
      if (field.isSystem) {
        continue;
      }
      const targetField = tFields.find(({ apiId }) => field.apiId === apiId);
      if (targetField) continue;

      if (field.stype) {
        const sField = field as SimpleField & { stype: SimpleFieldType };

        this.addSimpleFieldToSyncList({
          apiId: sField.apiId,
          displayName: sField.displayName,
          description: sField.description,
          type: sField.stype,
        });
      }

      if (field.etype) {
        const eField = field as EnumerableField;
        const enumerationApiId = eField.enumeration.apiId;
        const shareEnumeration = this.shareEnumerations.find(
          ({ apiId }) => apiId === enumerationApiId,
        );
        if (!shareEnumeration) return;

        this.addEnumerationToSyncList({
          apiId: shareEnumeration.apiId,
          displayName: shareEnumeration.displayName,
          description: shareEnumeration.description,
          values: shareEnumeration.values,
        });

        this.addEnumerableFieldToSyncList({
          apiId: eField.apiId,
          displayName: eField.displayName,
          description: eField.description,
          enumerationApiId,
        });
      }

      if (field.ctype) {
        const cField = field as ComponentField;
        const componentApiId = cField.component.apiId;
        const targetComponent = this.shareComponents.find(
          ({ apiId }) => apiId === componentApiId,
        );
        if (!targetComponent) return;

        this.addComponentToSyncList(
          {
            apiId: targetComponent.apiId,
            apiIdPlural: targetComponent.apiIdPlural,
            displayName: targetComponent.displayName,
          },
          targetComponent.fields,
        );

        this.addComponentFiledToSyncList({
          apiId: cField.apiId,
          displayName: cField.displayName,
          description: cField.description,
          componentApiId: cField.component.apiId,
          parentApiId: cField.parent.apiId,
        });
      }

      if (field.cutype) {
        const cuField = field as ComponentUnionField;
        const allComponents = cuField.components;
        const componentApiIds: string[] = allComponents.map(
          ({ apiId }) => apiId,
        );

        this.shareComponents.forEach((component) => {
          if (componentApiIds.includes(component.apiId)) {
            this.addComponentToSyncList(
              component,
              component.fields as FieldType[],
            );
          }
        })

        this.addComponentUnionFieldToSyncList({
          apiId: cuField.apiId,
          displayName: cuField.displayName,
          description: cuField.description,
          parentApiId: cuField.parent.apiId,
          componentApiIds,
        });
      }

      if (field.utype) {
        const uField = field as UnionField;
        const modelApiIds = uField.union.memberTypes.map(({ apiId }) => apiId);

        modelApiIds.forEach((modelApiId) => {
          const shareModel = this.shareModels.find(
            ({ apiId }) => apiId === modelApiId,
          );
          if (!shareModel) return;

          this.addModelToSyncList(
            {
              apiId: shareModel.apiId,
              displayName: shareModel.displayName,
              description: shareModel.description,
              apiIdPlural: shareModel.apiIdPlural,
            },
            shareModel.fields as FieldType[],
          );
        });

        this.addUnionFieldToSyncList({
          apiId: uField.apiId,
          displayName: uField.displayName,
          description: uField.description,
          parentApiId: uField.parent.apiId,
          reverseField: {
            apiId: uField.union.apiId,
            modelApiIds: modelApiIds,
            displayName: uField.union.displayName,
            description: uField.union.description,
          },
        });
      }

      if (field.rtype) {
        const rField = field as RelationalField & { rtype: RelationalFieldType };

        const reverseField = {
          modelApiId: rField.relatedModel.apiId,

          apiId: rField.relatedField.apiId,
          displayName: rField.relatedField.displayName,
          isList: rField.relatedField.isList,
          isRequired: rField.relatedField.isRequired,
          visibility: rField.relatedField.visibility,
        }

        this.addRelationalFieldToSyncList({
          apiId: rField.apiId,
          parentApiId: rField.parent.apiId,
          displayName: rField.displayName,
          description: rField.description,
          type: rField.rtype,
          isList: rField.isList,
          isRequired: rField.isRequired,
          visibility: rField.visibility,
          reverseField
        });
      }

      if (field.udrtype) {
        const rField = field as UniDirectionalRelationalField & { rtype: RelationalFieldType };

        const reverseField = {
          modelApiId: rField.relatedModel.apiId,
          apiId: rField.apiId,
          displayName: rField.displayName,
          isUnidirectional: true
        }

        this.addRelationalFieldToSyncList({
          apiId: rField.apiId,
          parentApiId: rField.parent.apiId,
          displayName: rField.displayName,
          description: rField.description,
          type: rField.rtype,
          isList: rField.isList,
          isRequired: rField.isRequired,
          visibility: rField.visibility,
          reverseField
        });
      }

      callback(field);
    }
  }

  addSimpleFieldToSyncList(data: BatchMigrationCreateSimpleFieldInput) {
    this.syncList.push({ actionType: 'createSimpleField', data });
  }

  addEnumerableFieldToSyncList(data: BatchMigrationCreateEnumerableFieldInput) {
    this.syncList.push({ actionType: 'createEnumerableField', data });
  }

  addComponentFiledToSyncList(data: BatchMigrationCreateComponentFieldInput) {
    this.syncList.push({ actionType: 'createComponentField', data });
  }

  addComponentUnionFieldToSyncList(
    data: BatchMigrationCreateComponentUnionFieldInput,
  ) {
    this.syncList.push({ actionType: 'createComponentUnionField', data });
  }

  addRelationalFieldToSyncList(data: BatchMigrationCreateRelationalFieldInput) {
    this.syncList.push({ actionType: 'createRelationalField', data });
  }

  addUnionFieldToSyncList(data: BatchMigrationCreateUnionFieldInput) {
    this.syncList.push({ actionType: 'createUnionField', data });
  }

  async startMutation() {
    console.log(this.syncList);
    this.syncList.forEach(({ actionType, data }) => {
      if (actionType === 'createModel') {
        this.mutationClinet.createModel(data as BatchMigrationCreateModelInput);
      }

      if (actionType === 'createComponent') {
        this.mutationClinet.createComponent(data as BatchMigrationCreateComponentInput);
      }

      if (actionType === 'createEnumeration') {
        this.mutationClinet.createEnumeration(data as BatchMigrationCreateEnumerationInput);
      }

      if (actionType === 'createSimpleField') {
        this.mutationClinet.createSimpleField(data as BatchMigrationCreateSimpleFieldInput);
      }

      if (actionType === 'createEnumerableField') {
        this.mutationClinet.createEnumerableField(
          data as BatchMigrationCreateEnumerableFieldInput,
        );
      }

      if (actionType === 'createComponentField') {
        this.mutationClinet.createComponentField(
          data as BatchMigrationCreateComponentFieldInput,
        );
      }

      if (actionType === 'createComponentUnionField') {
        this.mutationClinet.createComponentUnionField(
          data as BatchMigrationCreateComponentUnionFieldInput,
        );
      }

      if (actionType === 'createRelationalField') {
        this.mutationClinet.createRelationalField(
          data as BatchMigrationCreateRelationalFieldInput,
        );
      }

      if (actionType === 'createUnionField') {
        this.mutationClinet.createUnionField(data as BatchMigrationCreateUnionFieldInput);
      }
    });

    this.mutationClinet.createModel({
      apiId: 'Test',
      displayName: 'test',
      description: 'test',
      apiIdPlural: 'PluralTest'
    })

    console.log(this.mutationClinet.dryRun());
    const changes = await this.mutationClinet.run();
    console.log('changes', changes);
  }
}
