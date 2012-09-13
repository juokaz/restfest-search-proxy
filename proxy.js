var http = require('http');
ElasticSearchClient = require('elasticsearchclient');

var api = 'SOME_URL';

var serverOptions = {
    host: 'localhost',
    port: 9200,
}, index_name = '', type_name = '';

var elasticSearchClient = new ElasticSearchClient(serverOptions);

http.createServer(function(request, response) {
  var proxy = http.createClient(80, api);
  var search = false;

  // search params
  var title = request.body.title;

  if (title) {
    // build query object
    var qryObj = {
        "query" : {
            "term" : { "title" : title }
        }
    };
    // query documents from elasticsearch
    elasticSearchClient.search(index_name, type_name, qryObj)
        .on('data', function(data) {
            var result = JSON.parse(data);

            var items = [];
            result.hits.hits.forEach(function(item) {
              items[] = item._source.ticket_xml;
            });

            // build tickets xml from items array
            response.write("Hello World");
            response.end();
        })
        .on('done', function(){
            //always returns 0 right now
        })
        .on('error', function(error){
            console.log(error)
        })
        .exec();
  } else {
    var proxy_request = proxy.request(request.method, request.url, request.headers);
    proxy_request.addListener('response', function (proxy_response) {
      proxy_response.addListener('data', function(chunk) {
        response.write(chunk, 'binary');
      });
      proxy_response.addListener('end', function() {
        response.end();
      });
      response.writeHead(proxy_response.statusCode, proxy_response.headers);
    });
    request.addListener('data', function(chunk) {
      proxy_request.write(chunk, 'binary');
    });
    request.addListener('end', function() {
      proxy_request.end();
    });
  }
}).listen(80);