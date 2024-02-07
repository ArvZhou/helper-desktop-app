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
import { log } from 'electron-log';

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
          endpoint: string;
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
  operationName: ActionType;
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
  const endpoint = allDocument.data.viewer.project.environment.endpoint;

  return { ...allDocument.data.viewer.project.environment.contentModel, endpoint };
};

export const exportJSON = (json: any, filename: string) => {
  fs.writeFile(`${__dirname}/.data/${filename}.json`,JSON.stringify(json, null,"\t"),function(err){
    if (err) {
      log(err);
    }
  })
}

export const getJSONFormFile = (filename: string) => {
  return JSON.parse(fs.readFileSync(`${__dirname}/.data/${filename}.json`, 'utf-8'));
}
