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
  exportJSON,
  getAllSchemas,
} from './hygraph.utils';

export class HygraphSync {
  projectInfo: Variables;
  syncList: SyncListItem[];
  shareEnumerations: dataStructure['enumerations'];
  shareModels: dataStructure['models'] = [];
  shareComponents: dataStructure['components'];
  targetModels: dataStructure['models'];
  targetComponents: dataStructure['components'];
  mutationClinet: Client | null = null;
  targetEndpoint: string = '';
  targetEnumerations: BatchMigrationCreateEnumerationInput[];
  currentAddingApiIds: Record<string, boolean>;

  constructor(projectInfo: Variables) {
    this.projectInfo = projectInfo;
    this.syncList= [];
    this.shareComponents = [];
    this.shareEnumerations = [];
    this.targetModels = [];
    this.targetComponents = [];
    this.targetEnumerations = [];
    this.currentAddingApiIds = {};
    this.startSync(projectInfo);
  }

  async startSync({ SHARE_PROJECT, TARGET_PROJECT }: Variables) {
    const shareSchema = await getAllSchemas(SHARE_PROJECT);
    this.shareEnumerations = shareSchema.enumerations;
    this.shareModels = shareSchema.models;
    this.shareComponents = shareSchema.components;
    exportJSON(shareSchema, 'share_schema');

    const targetSchema = await getAllSchemas(TARGET_PROJECT);
    this.targetEnumerations = targetSchema.enumerations;
    this.targetModels = targetSchema.models;
    this.targetComponents = targetSchema.components;
    this.targetEndpoint = targetSchema.endpoint;
    this.mutationClinet = new Client({
      authToken: TARGET_PROJECT.TOKEN,
      endpoint: this.targetEndpoint,
    });

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
    this.currentAddingApiIds[data.apiId] = true;
    const targets =
      type === 'model' ? this.targetModels : this.targetComponents;
    let target = targets.find(({ apiId }) => data.apiId === apiId);
    if (!target) {
      this.syncList.push({
        operationName: type === 'model' ? 'createModel' : 'createComponent',
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
    let targetEnumeration = this.targetEnumerations.find(
      ({ apiId }) => data.apiId === apiId,
    );
    if (!targetEnumeration) {
      this.syncList.push({ operationName: 'createEnumeration', data });
      targetEnumeration = data;
      this.targetEnumerations.push(targetEnumeration);
    }
  }

  addFieldsToList(
    sFields: FieldType[],
    tFields: FieldType[],
    callback: (field: FieldType) => void,
  ) {
    console.log('sFields', sFields);
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
          parentApiId: sField.parent?.apiId,
          type: sField.stype,
        });
      }

      if (field.etype) {
        const eField = field as EnumerableField;
        const enumerationApiId = eField.enumeration.apiId;
        const shareEnumeration = this.shareEnumerations.find(
          ({ apiId }) => apiId === enumerationApiId,
        );
        if (shareEnumeration) {
          this.addEnumerationToSyncList({
            apiId: shareEnumeration.apiId,
            displayName: shareEnumeration.displayName,
            description: shareEnumeration.description,
            values: shareEnumeration.values.map(({ apiId, displayName }) => ({
              apiId,
              displayName,
            })),
          });
        }

        this.addEnumerableFieldToSyncList({
          apiId: eField.apiId,
          displayName: eField.displayName,
          description: eField.description,
          parentApiId: eField.parent?.apiId,
          enumerationApiId,
        });
      }

      if (field.ctype) {
        const cField = field as ComponentField;
        const componentApiId = cField.component.apiId;
        const targetComponent = this.shareComponents.find(
          ({ apiId }) => apiId === componentApiId,
        );
        if (targetComponent) {
          this.addComponentToSyncList(
            {
              apiId: targetComponent.apiId,
              apiIdPlural: targetComponent.apiIdPlural,
              displayName: targetComponent.displayName,
            },
            targetComponent.fields,
          );
        }

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
              {
                apiId: component.apiId,
                apiIdPlural: component.apiIdPlural,
                displayName: component.displayName,
              },
              component.fields as FieldType[],
            );
          }
        });

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
        const modelApiIds = uField.union.memberTypes.map(
          ({ parent: { apiId } }) => apiId,
        );

        [...modelApiIds, uField.union.field.parent.apiId].forEach(
          (modelApiId) => {
            const shareModel = this.shareModels.find(
              ({ apiId }) => apiId === modelApiId,
            );
            if (shareModel) {
              this.addModelToSyncList(
                {
                  apiId: shareModel.apiId,
                  displayName: shareModel.displayName,
                  description: shareModel.description,
                  apiIdPlural: shareModel.apiIdPlural,
                },
                shareModel.fields as FieldType[],
              );
            }
          },
        );

        if (modelApiIds.includes(field.parent.apiId)) {
          continue;
        }

        this.addUnionFieldToSyncList({
          apiId: uField.apiId,
          displayName: uField.displayName,
          description: uField.description,
          parentApiId: uField.parent.apiId,
          isList: uField.isList,
          reverseField: {
            apiId: uField.union.field.apiId,
            modelApiIds,
            displayName: uField.union.field.displayName,
            description: uField.union.field.description,
            isList: uField.union.field.isList,
            visibility: uField.union.field.visibility,
          },
        });
      }

      if (field.rtype) {
        const rField = field as RelationalField & {
          rtype: RelationalFieldType;
        };

        if (
          rField.relatedModel.apiId !== 'ASSET' &&
          rField.relatedModel.apiId
        ) {
          const shareModel = this.shareModels.find(
            ({ apiId }) => apiId === rField.relatedModel.apiId,
          );

          if (shareModel) {
            this.addModelToSyncList(
              {
                apiId: shareModel.apiId,
                displayName: shareModel.displayName,
                description: shareModel.description,
                apiIdPlural: shareModel.apiIdPlural,
              },
              shareModel.fields as FieldType[],
            );
          }
        }

        const targetModel = this.targetModels.find(
          ({ apiId }) => apiId === rField.relatedModel.apiId,
        )
        const targetField = targetModel?.fields?.find(
          ({ apiId }) => apiId === rField.relatedField.apiId
        )

        if (targetField) {
          continue
        }

        const reverseField = {
          modelApiId: rField.relatedModel.apiId,

          apiId: rField.relatedField.apiId,
          displayName: rField.relatedField.displayName,
          isList: rField.relatedField.isList,
          isRequired: rField.relatedField.isRequired,
          visibility: rField.relatedField.visibility,
        };

        this.addRelationalFieldToSyncList({
          apiId: rField.apiId,
          parentApiId: rField.parent.apiId,
          displayName: rField.displayName,
          description: rField.description,
          type: rField.rtype,
          isList: rField.isList,
          isRequired: rField.isRequired,
          visibility: rField.visibility,
          reverseField,
        });
      }

      if (field.udrtype) {
        const rField = field as UniDirectionalRelationalField & {
          udrtype: RelationalFieldType;
        };

        if (
          rField.relatedModel.apiId !== 'ASSET' &&
          rField.relatedModel.apiId
        ) {
          const shareModel = this.shareModels.find(
            ({ apiId }) => apiId === rField.relatedModel.apiId,
          );
          if (shareModel) {
            this.addModelToSyncList(
              {
                apiId: shareModel.apiId,
                displayName: shareModel.displayName,
                description: shareModel.description,
                apiIdPlural: shareModel.apiIdPlural,
              },
              shareModel.fields as FieldType[],
            );
          }
        }

        const reverseField = {
          modelApiId: rField.relatedModel.apiId,
          apiId: rField.apiId,
          displayName: rField.displayName,
          isUnidirectional: true,
        };

        this.addRelationalFieldToSyncList({
          apiId: rField.apiId,
          parentApiId: rField.parent.apiId,
          displayName: rField.displayName,
          description: rField.description,
          type: rField.udrtype,
          isList: rField.isList,
          isRequired: rField.isRequired,
          visibility: rField.visibility,
          reverseField,
        });
      }

      callback(field);
    }
  }

  addSimpleFieldToSyncList(data: BatchMigrationCreateSimpleFieldInput) {
    this.syncList.push({ operationName: 'createSimpleField', data });
  }

  addEnumerableFieldToSyncList(data: BatchMigrationCreateEnumerableFieldInput) {
    this.syncList.push({ operationName: 'createEnumerableField', data });
  }

  addComponentFiledToSyncList(data: BatchMigrationCreateComponentFieldInput) {
    this.syncList.push({ operationName: 'createComponentField', data });
  }

  addComponentUnionFieldToSyncList(
    data: BatchMigrationCreateComponentUnionFieldInput,
  ) {
    this.syncList.push({ operationName: 'createComponentUnionField', data });
  }

  addRelationalFieldToSyncList(data: BatchMigrationCreateRelationalFieldInput) {
    this.syncList.push({ operationName: 'createRelationalField', data });
  }

  addUnionFieldToSyncList(data: BatchMigrationCreateUnionFieldInput) {
    this.syncList.push({ operationName: 'createUnionField', data });
  }

  /**
   * Starts the mutation process,
   * iterating through the sync list and performing various mutation operations
   * based on the action type and data provided.
   *
   * @return {Promise<void>} A promise that resolves when the mutation process is complete
   */
  async startMutation() {
    const mutationClinet = this.mutationClinet as Client;
    exportJSON(this.syncList, 'syncList');
    this.syncList.forEach(({ operationName, data }) => {
      if (operationName === 'createModel') {
        mutationClinet.createModel(data as BatchMigrationCreateModelInput);
      }

      if (operationName === 'createComponent') {
        mutationClinet.createComponent(
          data as BatchMigrationCreateComponentInput,
        );
      }

      if (operationName === 'createEnumeration') {
        mutationClinet.createEnumeration(
          data as BatchMigrationCreateEnumerationInput,
        );
      }

      if (operationName === 'createSimpleField') {
        mutationClinet.createSimpleField(
          data as BatchMigrationCreateSimpleFieldInput,
        );
      }

      if (operationName === 'createEnumerableField') {
        mutationClinet.createEnumerableField(
          data as BatchMigrationCreateEnumerableFieldInput,
        );
      }

      if (operationName === 'createComponentField') {
        mutationClinet.createComponentField(
          data as BatchMigrationCreateComponentFieldInput,
        );
      }

      if (operationName === 'createComponentUnionField') {
        mutationClinet.createComponentUnionField(
          data as BatchMigrationCreateComponentUnionFieldInput,
        );
      }

      if (operationName === 'createRelationalField') {
        mutationClinet.createRelationalField(
          data as BatchMigrationCreateRelationalFieldInput,
        );
      }

      if (operationName === 'createUnionField') {
        mutationClinet.createUnionField(
          data as BatchMigrationCreateUnionFieldInput,
        );
      }
    });

    exportJSON(mutationClinet.dryRun(), 'dryRun');
    const changes = await mutationClinet.run();
    console.log('changes', changes);
  }
}
