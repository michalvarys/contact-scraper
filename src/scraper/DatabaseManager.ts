interface CompanyData {
  name: string;
  phone: string;
  website: string;
  'website-img': string;
  email: string;
  address: string;
  rating: string;
  reviewsCount: string;
  reviews: Array<{
    rating: string;
    message: string;
    name: string;
  }>;
  map: string;
}

export class DatabaseManager {
  private db: any; // Replace with your database implementation

  async saveSearchResults(searchKey: string, companies: string[]) {
    const searchData = {
      query: searchKey,
      link: companies[0], // Save first link as main search link
      companies
    };

    // Save to search collection
    await this.db.collection('search').insertOne(searchData);
  }

  async saveCompanyDetails(searchKey: string, companyData: CompanyData) {
    // Save to businesses collection
    await this.db.collection('businesses').insertOne(companyData);
  }
}