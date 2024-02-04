import fs from 'fs';
import { Variables } from '../../renderer/src/contants';
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
  ComponentField,
  ComponentFieldType,
  ComponentUnionField,
  ComponentUnionFieldType,
  EnumerableField,
  EnumerableFieldType,
  IField,
  RelationalField,
  RelationalFieldType,
  SimpleField,
  SimpleFieldType,
  UnionField,
  UnionFieldType,
} from '@hygraph/management-sdk';

export type CommonFieldType =
  | SimpleField
  | EnumerableField
  | ComponentField
  | ComponentUnionField
  | RelationalField
  | UnionField;

export type FieldType = CommonFieldType & {
  cutype?: ComponentUnionFieldType;
  utype?:  UnionFieldType;
  ctype?:  ComponentFieldType;
  udrtype?:  RelationalFieldType;
  rtype?:  RelationalFieldType;
  etype?:  EnumerableFieldType;
  stype?:  SimpleFieldType;
}
export type dataStructure = {
  models: {
    apiIdPlural: string;
    displayName: string;
    description: string;
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
        };
      };
    };
  };
};

export type ActionType =
  | 'createModel'
  | 'createComponent'
  | 'createEnumeration'
  | 'createSimpleField'
  | 'createEnumerableField'
  | 'createComponentField'
  | 'createComponentUnionField'
  | 'createRelationalField'
  | 'createUnionField';

export type SyncListItem = {
  actionType: ActionType;
  data:
    | BatchMigrationCreateModelInput
    | BatchMigrationCreateSimpleFieldInput
    | BatchMigrationCreateComponentInput
    | BatchMigrationCreateEnumerationInput
    | BatchMigrationCreateEnumerableFieldInput
    | BatchMigrationCreateComponentFieldInput
    | BatchMigrationCreateComponentUnionFieldInput
    | BatchMigrationCreateRelationalFieldInput
    | BatchMigrationCreateUnionFieldInput;
};

export type CreateModelInput = BatchMigrationCreateModelInput & {
  fields: FieldType[];
};

export type CreateComponentInput = BatchMigrationCreateComponentInput & {
  fields: FieldType[];
};

// export type SimpleFieldInput = BatchMigrationCreateSimpleFieldInput;

// export type EnumerableFieldInput = BatchMigrationCreateEnumerableFieldInput;

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

export const getTypeCategory = (type: string) => {
  if (type in Object.values(SimpleFieldType)) {
    return 's'
  }

  if (type in Object.values(EnumerableFieldType)) {
    return 'e'
  }

  if (type in Object.values(ComponentFieldType)) {
    return 'c'
  }

  if (type in Object.values(ComponentUnionFieldType)) {
    return 'cu'
  }

  if (type in Object.values(RelationalFieldType)) {
    return 'r'
  }

  if (type in Object.values(UnionFieldType)) {
    return 'u'
  }
  return '';
}
