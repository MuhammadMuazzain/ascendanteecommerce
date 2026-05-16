export interface ProxyAccount {
  email: string;
  cookieUrl: string;
  city: string;
}

export class ProxyService {
  private apiKey: string;
  private baseUrl: string;
  private accountListUrl: string;
  private accounts: ProxyAccount[] = [];

  constructor(url: string, apiKey: string, accountListUrl: string) {
    this.baseUrl = url;
    this.apiKey = apiKey;
    this.accountListUrl = accountListUrl;
  }

  private async fetchAccounts(): Promise<void> {
    if (this.accounts.length > 0) return;
    try {
      const response = await fetch(this.accountListUrl);
      if (response.ok) {
        this.accounts = await response.json();
      } else {
        console.error(
          `Failed to fetch accounts from ${this.accountListUrl}: ${response.statusText}`,
        );
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  }

  async getWebshareProxies(city: string): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/proxy/list/?mode=direct&page=1&page_size=15&search=${city}`,
        {
          headers: {
            Authorization: `Token ${this.apiKey}`,
          },
        },
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch proxies: ${response.statusText}`);
      }
      const data: any = await response.json();
      const results = data.results || [];
      return results.map(
        (p: any) => `http://${p.username}:${p.password}@${p.proxy_address}:${p.port}/`,
      );
    } catch (error) {
      console.error("Error fetching Webshare proxies:", error);
      return [];
    }
  }

  async getCookiesAndProxies(): Promise<{ cookieUrl: string; proxyUrl: string }[]> {
    try {
      await this.fetchAccounts();
      if (this.accounts.length === 0) {
        console.warn("No accounts available for ProxyService");
        return [];
      }

      const results: { cookieUrl: string; proxyUrl: string }[] = [];

      // Group accounts by city to optimize proxy fetching
      const cityToAccounts = this.accounts.reduce(
        (acc, account) => {
          if (!acc[account.city]) acc[account.city] = [];
          acc[account.city].push(account);
          return acc;
        },
        {} as Record<string, any[]>,
      );

      await Promise.all(
        Object.entries(cityToAccounts).map(async ([city, accounts]) => {
          const proxies = await this.getWebshareProxies(city);
          if (proxies.length === 0) return;

          for (const account of accounts) {
            results.push(
              ...proxies.map((proxyUrl) => ({
                cookieUrl: account.cookieUrl,
                proxyUrl: proxyUrl,
              })),
            );
          }
        }),
      );

      return results;
    } catch (error) {
      console.error("Error in getCookiesAndProxies:", error);
      return [];
    }
  }
}
