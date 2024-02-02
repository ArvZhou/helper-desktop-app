import fs from 'fs';
import { Variables } from '../../renderer/src/contants';
import {
  BatchMigrationCreateComponentInput,
  BatchMigrationCreateEnumerableFieldInput,
  BatchMigrationCreateEnumerationInput,
  BatchMigrationCreateModelInput,
  BatchMigrationCreateSimpleFieldInput,
  EnumerableFieldType,
  IField,
  SimpleFieldType,
} from '@hygraph/management-sdk';

export type FieldType = IField & {
  stype?: SimpleFieldType;
  etype?: EnumerableFieldType;
  enumeration?: {
    apiId: string;
    displayName: string;
  }
};

export type ActionType =
  | 'createModel'
  | 'createComponent'
  | 'createEnum'
  | 'createSimpleField'
  | 'createField'
  | 'createEnumerableField'
  | 'createEnumeration';

export type dataStructure = {
  models: {
    apiIdPlural: string;
    displayName: string;
    apiId: string;
    fields: FieldType[];
  }[];
  components: {
    apiIdPlural: string;
    displayName: string;
    apiId: string;
    fields: FieldType[];
  }[];
  enumerations: BatchMigrationCreateEnumerationInput[];
};
type SchemeFragment = {
  data: {
    viewer: {
      project: {
        environment: {
          contentModel: dataStructure;
        }
      };
    };
  }
};

export type SyncListItem = {
  actionType: ActionType;
  data:
    | BatchMigrationCreateModelInput
    | BatchMigrationCreateSimpleFieldInput
    | BatchMigrationCreateComponentInput
    | BatchMigrationCreateEnumerationInput
    | BatchMigrationCreateEnumerableFieldInput
};

export type CreateModelInput = BatchMigrationCreateModelInput & {
  fields: FieldType[];
};

export type CreateComponentInput = BatchMigrationCreateComponentInput & {
  fields: FieldType[];
};

export type SimpleFieldInput = BatchMigrationCreateSimpleFieldInput;

export type EnumerableFieldInput = BatchMigrationCreateEnumerableFieldInput;

export const getAllSchemas = async ({
  MANAGEMENT_URL,
  TOKEN,
  PROJECT_ID,
  ENVIRONMENT,
}: Variables['TARGET_PROJECT']) => {
  const querySchemaSql = fs.readFileSync(
    `${__dirname}/query.schema.gql`,
    'utf-8',
  );

  const reslut = await fetch(MANAGEMENT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      query: querySchemaSql,
      variables: { projectId: PROJECT_ID, environment: ENVIRONMENT },
    }),
  });

  const allDocument = (await reslut.json()) as SchemeFragment;

  return allDocument.data.viewer.project.environment.contentModel;
};
