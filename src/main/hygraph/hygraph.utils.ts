
import fs from 'fs'

type SchemeFragment = {
  viewer: {
    project: {
      contentModel: {
        models: {
          apiIdPlural: string,
          displayName: string
          apiId: string,
          fields: unknown[]
        },
        components: {
          apiIdPlural: string,
          displayName: string
          apiId: string,
          fields: unknown[]
        },
        enumerations: {
          id: string,
          apiId: string,
          displayName: string,
          values: unknown[],
          isSystem: boolean
        }
      }
    }
  }
}

export const getAllSchemas = async ({
  managementUrl,
  token,
  projectId,
  environment,
  searchName
}: {
  managementUrl: string
  token: string
  projectId: string,
  environment: string,
  searchName: string
}
) => {
  const querySchemaSql = fs.readFileSync(`${__dirname}/query.schema.gql`, 'utf-8');

  const reslut = await fetch(managementUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      query: querySchemaSql,
      variables: { projectId, environment },
    })
  })

  const schema = await reslut.json()

  return schema
}

export const generateMotationTree = () => {
  return []
}
