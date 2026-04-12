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
};