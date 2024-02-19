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
import { BrowserWindow } from 'electron';
import log from 'electron-log';

export class HygraphSync {
  projectInfo: Variables;
  mainWindow: BrowserWindow | undefined;
  syncList: SyncListItem[];
  shareEnumerations: dataStructure['enumerations'];
  shareModels: dataStructure['models'];
  shareComponents: dataStructure['components'];
  targetModels: dataStructure['models'];
  targetComponents: dataStructure['components'];
  mutationClinet: Client | null = null;
  targetEndpoint: string = '';
  targetEnumerations: BatchMigrationCreateEnumerationInput[];
  currentAddingApiIds: Record<string, boolean>;

  /**
   * Constructor for initializing project information and setting up synchronization.
   *
   * @param {Variables} projectInfo - the project information
   * @param {(arg: string) => void} [log] - optional logging function
   */
  constructor(projectInfo: Variables, mainWindow?: BrowserWindow) {
    this.projectInfo = projectInfo;
    this.mainWindow = mainWindow;
    this.syncList = [];
    this.shareModels = [];
    this.shareComponents = [];
    this.shareEnumerations = [];
    this.targetModels = [];
    this.targetComponents = [];
    this.targetEnumerations = [];
    this.currentAddingApiIds = {};

    this.startSync();
  }

  /**
   * Logs the given string to the console.
   *
   * @param {string} msg - the string to be logged
   * @return {void}
   */
  log(msg: string, type?: string) {
    if (this.mainWindow) {
      this.mainWindow?.webContents.send('hygraphSync:msg', { msg, type });

      switch (type) {
        case 'warn':
          return log.warn(msg);
        case 'error':
          return log.error(msg);
        default:
          return log.info(msg);
      }
    }

    console.log(msg);
  }

  /**
   * A function to start the synchronization process. It gets the schema of the source project and target project, and initializes necessary variables.
   *
   * @return {Promise<void>} This function does not return anything.
   */
  async startSync() {
    this.log("Start to get source project's schema!");
    const { SHARE_PROJECT, TARGET_PROJECT } = this.projectInfo;
    const shareSchema = await getAllSchemas(SHARE_PROJECT);
    this.shareEnumerations = shareSchema.enumerations;
    this.shareModels = shareSchema.models;
    this.shareComponents = shareSchema.components;
    this.log("Get source project's schema successfully!");
    if (process.env.NODE_ENV === 'development') {
      exportJSON(shareSchema, 'share_schema');
    }

    this.log("Start to get target project's schema!");
    const targetSchema = await getAllSchemas(TARGET_PROJECT);
    this.targetEnumerations = targetSchema.enumerations;
    this.targetModels = targetSchema.models;
    this.targetComponents = targetSchema.components;
    this.targetEndpoint = targetSchema.endpoint;
    this.mutationClinet = new Client({
      authToken: TARGET_PROJECT.TOKEN,
      endpoint: this.targetEndpoint,
    });
    this.log("Get target project's schema successfully!");
    if (process.env.NODE_ENV === 'development') {
      exportJSON(targetSchema, 'target_schema');
    }
    this.generateNeedSyncList(shareSchema);
    this.startMutation();
  }

  /**
   * Generate a list of items that need to be synchronized based on the provided share data structure.
   *
   * @param {dataStructure} share - the data structure containing models and components to be synchronized
   */
  generateNeedSyncList(share: dataStructure) {
    this.log('Start to generate need sync list!');
    const filterName = this.projectInfo.SHARE_PROJECT.MODEL_OR_COMPONENT_NAME;
    const models = share.models.filter(({ displayName }) =>
      displayName.includes(filterName),
    );
    this.log(
      `Need to sync ${models.length} models! ${models.map((m) => m.displayName).join(' & ')}`,
    );

    const components = share.components.filter(({ displayName }) =>
      displayName.includes(filterName),
    );
    this.log(
      `Need to sync ${components.length} components! ${components.map((m) => m.displayName).join(' & ')}`,
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

  /**
   * Add a model to the synchronization list.
   *
   * @param {BatchMigrationCreateModelInput} data - the data for the model
   * @param {FieldType[]} fields - the fields for the model
   * @return {void}
   */
  addModelToSyncList(
    data: BatchMigrationCreateModelInput,
    fields: FieldType[],
  ) {
    this.addModelOrComponentToSyncList(data, fields, 'model');
  }

  /**
   * Adds a component to the sync list.
   *
   * @param {BatchMigrationCreateComponentInput} data - the data for the component
   * @param {FieldType[]} fields - an array of field types
   * @return {void}
   */
  addComponentToSyncList(
    data: BatchMigrationCreateComponentInput,
    fields: FieldType[],
  ) {
    this.addModelOrComponentToSyncList(data, fields, 'component');
  }

  /**
   * Adds a model or component to the synchronization list.
   *
   * @param {BatchMigrationCreateComponentInput | BatchMigrationCreateModelInput} data - the data for the model or component
   * @param {FieldType[]} fields - the fields for the model or component
   * @param {'component' | 'model'} type - the type of the data ('component' or 'model')
   */
  addModelOrComponentToSyncList(
    data: BatchMigrationCreateComponentInput | BatchMigrationCreateModelInput,
    fields: FieldType[],
    type: 'component' | 'model',
  ) {
    if (this.currentAddingApiIds[data.apiId]) {
      this.log(
        `This ${type} [${data.displayName}] is being added, so this action will be ignored`,
        'warn',
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
      this.log(`Added [${data.displayName}] to the ${type} sync list!`, 'info');
    }

    this.addFieldsToList(fields, target?.fields || [], (field: FieldType) => {
      target?.fields.push(field);
    });
    delete this.currentAddingApiIds[data.apiId];
  }

  /**
   * Add an enumeration to the sync list if not already present.
   *
   * @param {BatchMigrationCreateEnumerationInput} data - the enumeration data to be added
   * @return {void}
   */
  addEnumerationToSyncList(data: BatchMigrationCreateEnumerationInput) {
    let targetEnumeration = this.targetEnumerations.find(
      ({ apiId }) => data.apiId === apiId,
    );
    if (!targetEnumeration) {
      this.syncList.push({ operationName: 'createEnumeration', data });
      targetEnumeration = data;
      this.targetEnumerations.push(targetEnumeration);
      this.log(
        `Added [${data.displayName}] to the enumeration sync list!`,
        'info',
      );
    }
  }

  /**
   * Adds fields from source list to target list if they don't already exist
   * @param sFields - Source fields to be checked against
   * @param tFields - Target fields to add to
   * @param fieldAddedCallback - Callback function to be called for each field that is added
   */
  addFieldsToList(
    sFields: FieldType[],
    tFields: FieldType[],
    fieldAddedCallback: (field: FieldType) => void,
  ) {
    // Iterate through source fields
    for (const field of sFields) {
      // Skip system fields
      if (field.isSystem) {
        continue;
      }
      const targetField = tFields.find(({ apiId }) => field.apiId === apiId);
      if (targetField) continue;

      if (field.stype) {
        this.log(
          `Adding simple field [${field.displayName}] to the sync list!`,
          'info',
        );
        const sField = field as SimpleField & { stype: SimpleFieldType };

        this.addSimpleFieldToSyncList({
          apiId: sField.apiId,
          displayName: sField.displayName,
          description: sField.description,
          parentApiId: sField.parent?.apiId,
          type: sField.stype,
          isRequired: sField.isRequired,
          isList: sField.isList,
        });
      }

      if (field.etype) {
        this.log(
          `Adding enumerable field [${field.displayName}] to the sync list!`,
          'info',
        );
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
        this.log(
          `Adding component field [${field.displayName}] to the sync list!`,
          'info',
        );
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
        this.log(
          `Adding component union field [${field.displayName}] to the sync list!`,
          'info',
        );
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
        this.log(
          `Adding union field [${field.displayName}] to the sync list!`,
          'info',
        );
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
        );
        const targetField = targetModel?.fields?.find(
          ({ apiId }) => apiId === rField.relatedField.apiId,
        );

        if (targetField) {
          continue;
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
        this.log(
          `Adding unidirectional relational field [${field.displayName}] to the sync list!`,
          'info',
        );
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

      fieldAddedCallback(field);
    }
  }

  /**
   * Add a simple field to the sync list.
   *
   * @param {BatchMigrationCreateSimpleFieldInput} data - the data for creating a simple field
   * @return {void}
   */
  addSimpleFieldToSyncList(data: BatchMigrationCreateSimpleFieldInput): void {
    this.syncList.push({ operationName: 'createSimpleField', data });
    this.log(
      `Added simple field [${data.displayName}] to the sync list!`,
      'info',
    );
  }

  /**
   * Adds an enumerable field to the sync list.
   *
   * @param {BatchMigrationCreateEnumerableFieldInput} data - the data for creating the enumerable field
   * @return {void}
   */
  addEnumerableFieldToSyncList(
    data: BatchMigrationCreateEnumerableFieldInput,
  ): void {
    this.syncList.push({ operationName: 'createEnumerableField', data });
    this.log(
      `Added enumerable field [${data.displayName}] to the sync list!`,
      'info',
    );
  }

  /**
   * Add component field to sync list.
   *
   * @param {BatchMigrationCreateComponentFieldInput} data - the data for creating component field
   * @return {void}
   */
  addComponentFiledToSyncList(
    data: BatchMigrationCreateComponentFieldInput,
  ): void {
    this.syncList.push({ operationName: 'createComponentField', data });
    this.log(
      `Added component field [${data.displayName}] to the sync list!`,
      'info',
    );
  }

  /**
   * Add a component union field to the sync list.
   *
   * @param {BatchMigrationCreateComponentUnionFieldInput} data - the data for creating the component union field
   * @return {void}
   */
  addComponentUnionFieldToSyncList(
    data: BatchMigrationCreateComponentUnionFieldInput,
  ): void {
    this.syncList.push({ operationName: 'createComponentUnionField', data });
    this.log(
      `Added component union field [${data.displayName}] to the sync list!`,
      'info',
    );
  }

  /**
   * Adds a relational field to the sync list.
   *
   * @param {BatchMigrationCreateRelationalFieldInput} data - the input for creating a relational field
   * @return {void}
   */
  addRelationalFieldToSyncList(
    data: BatchMigrationCreateRelationalFieldInput,
  ): void {
    this.syncList.push({ operationName: 'createRelationalField', data });
    this.log(
      `Added relational field [${data.displayName}] to the sync list!`,
      'info',
    );
  }

  /**
   * Adds a union field to the sync list.
   *
   * @param {BatchMigrationCreateUnionFieldInput} data - the data for creating the union field
   * @return {void}
   */
  addUnionFieldToSyncList(data: BatchMigrationCreateUnionFieldInput): void {
    this.syncList.push({ operationName: 'createUnionField', data });
    this.log(
      `Added union field [${data.displayName}] to the sync list!`,
      'info',
    );
  }

  /**
   * Starts the mutation process,
   * iterating through the sync list and performing various mutation operations
   * based on the action type and data provided.
   *
   * @return {Promise<void>} A promise that resolves when the mutation process is complete
   */
  async startMutation() {
    // Ensure mutationClinet is an instance of Client
    const mutationClinet = this.mutationClinet as Client;

    if (this.syncList.length === 0) {
      this.log('No data to sync, all data is up to date', 'warn');
      this.mainWindow?.webContents.send('hygraphSync:success', '')
      return;
    }

    this.log('Starting mutation process...', 'info');

    // Export the syncList to a file for debugging purposes
    if (process.env.NODE_ENV === 'development') {
      exportJSON(this.syncList, 'syncList');
    }

    // Iterate through the syncList and perform mutation operations based on the action type and data
    this.syncList.forEach(({ operationName, data }) => {
      switch (operationName) {
        case 'createModel':
          mutationClinet.createModel(data as BatchMigrationCreateModelInput);
          break;
        case 'createComponent':
          mutationClinet.createComponent(
            data as BatchMigrationCreateComponentInput,
          );
          break;
        case 'createEnumeration':
          mutationClinet.createEnumeration(
            data as BatchMigrationCreateEnumerationInput,
          );
          break;
        case 'createSimpleField':
          mutationClinet.createSimpleField(
            data as BatchMigrationCreateSimpleFieldInput,
          );
          break;
        case 'createEnumerableField':
          mutationClinet.createEnumerableField(
            data as BatchMigrationCreateEnumerableFieldInput,
          );
          break;
        case 'createComponentField':
          mutationClinet.createComponentField(
            data as BatchMigrationCreateComponentFieldInput,
          );
          break;
        case 'createComponentUnionField':
          mutationClinet.createComponentUnionField(
            data as BatchMigrationCreateComponentUnionFieldInput,
          );
          break;
        case 'createRelationalField':
          mutationClinet.createRelationalField(
            data as BatchMigrationCreateRelationalFieldInput,
          );
          break;
        case 'createUnionField':
          mutationClinet.createUnionField(
            data as BatchMigrationCreateUnionFieldInput,
          );
          break;
        default:
          break;
      }
    });

    const changes = await mutationClinet.run();
    this.log(
      `Mutation reslut information: ${JSON.stringify(changes, null, 2)}`,
      'info',
    );

    if (changes.status === 'SUCCESS') {
      this.log('Mutation process completed successfully!!!!!', 'success');
      this.log('Please check the data in Hygraph page!!!!!', 'success');

      this.mainWindow?.webContents.send('hygraphSync:success', JSON.stringify(this.syncList))
    } else {
      this.log('Mutation process failed!', 'error');
      this.log(JSON.stringify(changes.errors), 'error');

      this.mainWindow?.webContents.send('hygraphSync:success', '');
    }
  }
}
