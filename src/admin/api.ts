const ADMIN_URL = "https://functions.poehali.dev/ef288d24-8632-43b5-a16c-ae5bd62e3d59";

function getToken(): string {
  return localStorage.getItem("admin_token") || "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function call(body: object): Promise<any> {
  const res = await fetch(ADMIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": getToken(),
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

export const adminApi = {
  login: (email: string, password: string) =>
    call({ action: "login", email, password }),

  me: () => call({ action: "me" }),

  logout: () => call({ action: "logout" }),

  stats: () => call({ action: "stats" }),

  quickLinks: () => call({ action: "quick_links" }),

  qlCreate: (data: { title: string; url: string; icon: string; sort_order: number }) =>
    call({ action: "ql_create", ...data }),

  qlUpdate: (data: { id: number; title: string; url: string; icon: string; sort_order: number }) =>
    call({ action: "ql_update", ...data }),

  qlDelete: (id: number) => call({ action: "ql_delete", id }),

  qlReorder: (items: { id: number; sort_order: number }[]) =>
    call({ action: "ql_reorder", items }),

  settingsGet: (group?: string) =>
    call({ action: "settings_get", group: group || "general" }),

  settingsSave: (data: Record<string, unknown>) =>
    call({ action: "settings_save", data }),

  serverTime: (timezone: string) =>
    call({ action: "server_time", timezone }),

  myIp: () =>
    call({ action: "my_ip" }),

  logs: (params?: { limit?: number; offset?: number; level?: string }) =>
    call({ action: "logs", ...(params || {}) }),

  userGroups: () => call({ action: "user_groups" }),

  groupCreate: (data: Record<string, unknown>) => call({ action: "group_create", ...data }),
  groupUpdate: (data: Record<string, unknown>) => call({ action: "group_update", ...data }),
  groupRemove: (id: number) => call({ action: "group_remove", id }),

  usersList: (params: Record<string, unknown>) => call({ action: "users_list", ...params }),
  usersBulk: (user_ids: number[], bulk_action: string, params?: Record<string, unknown>) =>
    call({ action: "users_bulk", user_ids, bulk_action, params: params || {} }),

  cfList: () => call({ action: "cf_list" }),
  cfCreate: (data: Record<string, unknown>) => call({ action: "cf_create", ...data }),
  cfUpdate: (data: Record<string, unknown>) => call({ action: "cf_update", ...data }),
  cfRemove: (id: number) => call({ action: "cf_remove", id }),

  cfFolderList: () => call({ action: "cf_folder_list" }),
  cfFolderCreate: (data: Record<string, unknown>) => call({ action: "cf_folder_create", ...data }),
  cfFolderUpdate: (data: Record<string, unknown>) => call({ action: "cf_folder_update", ...data }),
  cfFolderRemove: (id: number) => call({ action: "cf_folder_remove", id }),

  catList: () => call({ action: "cat_list" }),
  catCreate: (data: Record<string, unknown>) => call({ action: "cat_create", ...data }),
  catUpdate: (data: Record<string, unknown>) => call({ action: "cat_update", ...data }),
  catRemove: (id: number) => call({ action: "cat_remove", id }),
  catReorder: (items: { id: number; parent_id: number | null; sort_order: number }[]) =>
    call({ action: "cat_reorder", items }),

  acfFolderList: () => call({ action: "acf_folder_list" }),
  acfFolderCreate: (data: Record<string, unknown>) => call({ action: "acf_folder_create", ...data }),
  acfFolderUpdate: (data: Record<string, unknown>) => call({ action: "acf_folder_update", ...data }),
  acfFolderRemove: (id: number) => call({ action: "acf_folder_remove", id }),

  acfList: (folder_id?: number | null) =>
    call({ action: "acf_list", ...(folder_id !== undefined ? { folder_id } : {}) }),
  acfCreate: (data: Record<string, unknown>) => call({ action: "acf_create", ...data }),
  acfUpdate: (data: Record<string, unknown>) => call({ action: "acf_update", ...data }),
  acfRemove: (id: number) => call({ action: "acf_remove", id }),

  adsList: (params: Record<string, unknown>) => call({ action: "ads_list", ...params }),
  adsGet: (id: number) => call({ action: "ads_get", id }),
  adsUpdate: (data: Record<string, unknown>) => call({ action: "ads_update", ...data }),
  adsSetStatus: (ad_ids: number[], status: string, reason?: string) =>
    call({ action: "ads_set_status", ad_ids, status, ...(reason ? { reason } : {}) }),
  adsGetCf: () => call({ action: "ads_get_cf" }),
};