var http =                require('http'),
    request =             require('request'),
    ElasticSearchClient = require('elasticsearchclient');

var api = 'SOME_URL';

var serverOptions = {
    host: 'localhost',
    port: 9200,
}, index_name = '', type_name = '';

var elasticSearchClient = new ElasticSearchClient(serverOptions);

http.createServer(function(request, response) {
  var pathname = url.parse(request.url).pathname;

  if (pathname == '/') {
    request({uri: api + request.url}, function (error, response, body) {
      body = body.replace('</helpdesk>', '
  <atom:link rel="http://helpdesk.hackday.2012.restfest.org/rels/search" href="http://.../search" type="application/vnd.org.restfest.2012.hackday+xml" />
  <xhtml:form rel="http://helpdesk.hackday.2012.restfest.org/rels/search" action="http://.../search" type="application/vnd.org.restfest.2012.hackday+xml" method="get">
    <xhtml:input type="text" name="title" />
  </xhtml:form>
</helpdesk>');
      response.write(body);
      response.end();
    });

  } else if (pathname == '/search' && request.body.title) {
    // build query object
    var qryObj = {
        "query" : {
            "term" : { "title" : request.body.title }
        }
    };
    // query documents from elasticsearch
    elasticSearchClient.search(index_name, type_name, qryObj)
        .on('data', function(data) {
            var result = JSON.parse(data);

            // extract xml of tickets
            var items = new Array();
            result.hits.hits.forEach(function(item) {
              items.push(item._source.ticket_xml);
            });

            var body = '<search
  xmlns="urn:org.restfest.2012.hackday.helpdesk.feed"
  xmlns:ticket="urn:org.restfest.2012.hackday.helpdesk.ticket"
  xmlns:comment="urn:org.restfest.2012.hackday.helpdesk.comment"
  xmlns:atom="http://www.w3.org/2005/Atom"
>' + items.join("\n") + '</search>';

            response.write(body);
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
    var proxy = http.createClient(80, api);
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