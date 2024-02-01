import { Client } from "@hygraph/management-sdk";
import { Variables } from "../../renderer/src/contants";
import { getAllSchemas } from "./hygraph.utils";

export async function hygraphSync(projectInfo: Variables) {
  const s_p_id = projectInfo.SHARE_PROJECT.PROJECT_ID;
  const t_p_id = projectInfo.TARGET_PROJECT.PROJECT_ID;
  const s_p_token = projectInfo.SHARE_PROJECT.TOKEN;
  const t_p_token = projectInfo.TARGET_PROJECT.TOKEN;
  const s_p_m_url = projectInfo.SHARE_PROJECT.MANAGEMENT_URL;
  const t_p_m_url = projectInfo.TARGET_PROJECT.MANAGEMENT_URL;
  const s_p_env =  projectInfo.SHARE_PROJECT.ENVIRONMENT;
  const t_p_env =  projectInfo.TARGET_PROJECT.ENVIRONMENT;
  const s_p_m_name = projectInfo.SHARE_PROJECT.MODEL_OR_COMPONENT_NAME;

  const shareSchema = await getAllSchemas({
    managementUrl: s_p_m_url,
    token: s_p_token,
    projectId: s_p_id,
    environment: s_p_env,
    searchName: s_p_m_name
  });

  console.log('shareSchema', shareSchema);

  const s_p_client = new Client({
    endpoint: s_p_m_url,
    authToken: s_p_token
  });

  (async () => {

  })()

  return true
}
