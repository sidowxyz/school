import { searchRegex } from './query.js';

// Builds a find() from the query string: exact-match filters on the fields the
// caller allows, a literal "contains" search, sort, and a bounded page size.
class ApiFeatures {
  constructor(query, queryString, { filters = [], defaultLimit = 10, maxLimit = 1000 } = {}) {
    this.query = query;
    this.queryString = queryString;
    this.allowedFilters = filters;
    this.defaultLimit = defaultLimit;
    this.maxLimit = maxLimit;
  }

  filter() {
    const criteria = {};
    for (const field of this.allowedFilters) {
      const value = this.queryString[field];
      if (typeof value === 'string' && value !== '') criteria[field] = value;
    }
    this.query = this.query.find(criteria);
    return this;
  }

  search(searchFields) {
    const regex = searchRegex(this.queryString.search);
    if (regex) {
      this.query = this.query.find({ $or: searchFields.map((field) => ({ [field]: regex })) });
    }
    return this;
  }

  sort() {
    const sortBy = typeof this.queryString.sort === 'string' ? this.queryString.sort.split(',').join(' ') : '-createdAt';
    this.query = this.query.sort(sortBy);
    return this;
  }

  paginate() {
    const page = Math.max(1, Math.floor(Number(this.queryString.page)) || 1);
    const limit = Math.min(this.maxLimit, Math.max(1, Math.floor(Number(this.queryString.limit)) || this.defaultLimit));
    this.query = this.query.skip((page - 1) * limit).limit(limit);
    return this;
  }
}

export default ApiFeatures;
