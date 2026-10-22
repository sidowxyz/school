const dns = require('dns');
dns.resolve4('ac-fbhfgd7-shard-00-01.gsi5suf.mongodb.net', function(err, records) {
  console.log('Result:', err ? err.message : JSON.stringify(records));
});
