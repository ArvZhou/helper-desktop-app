import { Client, RelationalFieldType } from '@hygraph/management-sdk';
import { getJSONFormFile } from './hygraph.utils';

const projectInfo = getJSONFormFile('project_info');

const mutationClinet = new Client({
  authToken: projectInfo.TARGET_PROJECT.TOKEN,
  endpoint:
    'https://api-ca-central-1.hygraph.com/v2/clq3fho2n9dbq01uhcfcj084h/master',
});

// mutationClinet.createUnionField({
//   apiId: 'testUnionField',
//   displayName: 'test union field',
//   description: 'test union field',
//   parentApiId: 'Test202425',
//   reverseField: {
//     apiId: 'reverseTestUnionField',
//     modelApiIds: [
//       'Kkkk'
//     ],
//     displayName: 'reverseTestUnionField',
//     description: '-----',
//   }
// })

mutationClinet.createRelationalField({
  apiId: 'testAssetPicker',
  parentApiId: 'Test202425',
  displayName: 'testAssetPicker',
  type: RelationalFieldType.Asset,
  isList: true,
  reverseField: {
    modelApiId: 'Asset',
    apiId: 'testAssetPickerNewTest',
    displayName: 'testAssetPickerNewTest',
  },
});

mutationClinet.run().then((reslut) => {
  console.log('reslut', reslut);
});
