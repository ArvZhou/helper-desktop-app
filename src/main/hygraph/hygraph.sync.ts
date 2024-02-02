import {
  BatchMigrationCreateComponentInput,
  BatchMigrationCreateEnumerableFieldInput,
  BatchMigrationCreateEnumerationInput,
  BatchMigrationCreateModelInput,
  BatchMigrationCreateSimpleFieldInput,
  SimpleFieldType,
} from '@hygraph/management-sdk';
import { Variables } from '../../renderer/src/contants';
import {
  CreateComponentInput,
  CreateModelInput,
  EnumerableFieldInput,
  FieldType,
  SimpleFieldInput,
  SyncListItem,
  dataStructure,
  getAllSchemas,
} from './hygraph.utils';

export class HygraphSync {
  projectInfo: Variables;
  syncList: SyncListItem[] = [];
  shareEnumerations: dataStructure['enumerations'] = [];
  currentAddingApiIds: Record<string, boolean> = {};
  targetModels: dataStructure['models'] = [];
  targetComponents: dataStructure['components'] = [];

  constructor(projectInfo: Variables) {
    this.projectInfo = projectInfo;

    this.startSync(projectInfo);
  }

  async startSync({ SHARE_PROJECT, TARGET_PROJECT }: Variables) {
    const shareSchema = await getAllSchemas(SHARE_PROJECT);
    this.shareEnumerations = shareSchema.enumerations;

    const targetSchema = await getAllSchemas(TARGET_PROJECT);
    this.targetModels = targetSchema.models;
    this.targetComponents = targetSchema.components;

    this.generateNeedSyncList(shareSchema, targetSchema);

    console.log(this.syncList);
  }

  generateNeedSyncList(share: dataStructure, target: dataStructure) {
    const filterName = this.projectInfo.SHARE_PROJECT.MODEL_OR_COMPONENT_NAME;
    const models = share.models.filter(({ displayName }) =>
      displayName.includes(filterName),
    );
    const components = share.components.filter(({ displayName }) =>
      displayName.includes(filterName),
    );

    for (const model of models) {
      this.addModelToSyncList(
        model,
        this.targetModels.find(({ apiId }) => model.apiId === apiId),
      );
    }

    for (const component of components) {
      this.addComponentToSyncList(
        component,
        this.targetComponents.find(({ apiId }) => component.apiId === apiId),
      );
    }
  }

  addModelToSyncList(
    sharedModel: CreateModelInput,
    targetModel?: CreateModelInput,
  ) {
    if (this.currentAddingApiIds[sharedModel.apiId]) {
      console.log(
        'This component is being added, so this action will be ignored',
      );
      return;
    }

    this.currentAddingApiIds[sharedModel.apiId] = true;
    let finalModel = targetModel;

    if (!targetModel) {
      const { apiId, apiIdPlural, displayName, description } = sharedModel;
      const data: BatchMigrationCreateModelInput = {
        apiId,
        apiIdPlural,
        displayName,
        description,
        isSystem: false,
      };

      this.syncList.push({ actionType: 'createModel', data });
      finalModel = { ...sharedModel, fields: [] };
      this.targetModels.push(finalModel);
    } else {
      finalModel = targetModel;
    }

    this.addFieldsToList(
      sharedModel.fields,
      targetModel?.fields || [],
      (field: FieldType) => {
        finalModel?.fields.push(field);
      },
    );
    delete this.currentAddingApiIds[sharedModel.apiId];
  }

  addComponentToSyncList(
    sharedComponent: CreateComponentInput,
    targetComponent?: CreateComponentInput,
  ) {
    let finalComponent = targetComponent;
    if (this.currentAddingApiIds[sharedComponent.apiId]) {
      console.log(
        'This component is being added, so this action will be ignored',
      );
      return;
    }
    if (!targetComponent) {
      const { apiId, apiIdPlural, displayName, description } = sharedComponent;
      const data: BatchMigrationCreateComponentInput = {
        apiId,
        apiIdPlural,
        displayName,
        description,
      };

      this.syncList.push({ actionType: 'createComponent', data });
      finalComponent = { ...sharedComponent, fields: [] };
      this.targetModels.push(finalComponent);
    } else {
      finalComponent = targetComponent;
    }

    this.addFieldsToList(
      sharedComponent.fields,
      targetComponent?.fields || [],
      (field: FieldType) => {
        finalComponent?.fields.push(field);
      },
    );
  }

  addFieldsToList(
    sFields: FieldType[],
    tFields: FieldType[],
    callback: (field: FieldType) => void,
  ) {
    for (const field of sFields) {
      const targetField = tFields.find(({ apiId }) => field.apiId === apiId);
      if (targetField) return;

      if (field.stype) {
        const type = field.stype as SimpleFieldType;
        this.addSimpleFieldToSyncList({ ...field, type });
      }
      if (field.etype) {
        const enumerationApiId = (field.enumeration as { apiId: string }).apiId;
        const targetEnumeration = this.shareEnumerations.find(
          ({ apiId }) => apiId === enumerationApiId,
        );
        if (!targetEnumeration) return;
        this.addEnumerableToSyncList(targetEnumeration);
        this.addEnumerableFieldToSyncList({ ...field, enumerationApiId: enumerationApiId });
      }
      callback(field);
    }
  }

  addSimpleFieldToSyncList(sharedField: SimpleFieldInput) {
    const { apiId, displayName, description, type } = sharedField;
      const data: BatchMigrationCreateSimpleFieldInput = {
        apiId,
        displayName,
        description,
        type,
      };

      this.syncList.push({ actionType: 'createSimpleField', data });
  }

  addEnumerableToSyncList(data: BatchMigrationCreateEnumerationInput) {
    this.syncList.push({ actionType: 'createEnumeration', data });
  }

  addEnumerableFieldToSyncList(sharedField: EnumerableFieldInput) {
    const { apiId, displayName, description, enumerationApiId } = sharedField;
    const data: BatchMigrationCreateEnumerableFieldInput = {
      apiId,
      displayName,
      description,
      enumerationApiId,
    };

    this.syncList.push({ actionType: 'createEnumerableField', data });
  }
}
