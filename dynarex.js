// file: dynarex.js

// requires jaxle.js, and jfr.js

function dynarexNew(file) {

  var doc = Jaxle.new(file);
  var dynarex = new Object();
  
  dynarex.summary = doc.firstChild.xpath('summary/*').inject({},function(r,item){
    return r.merge(Hash(item.nodeName, item.text()));
  });
  
  dynarex.records = doc.firstChild.xpath('records/*').map(function(rec){
    return rec.elements().inject({},function(r,field){
      return r.merge(Hash(field.nodeName, field.text()));
    });
  });

  return dynarex;
}

Dynarex = {new: dynarexNew};

function findHTMLRecordToClone(element) {

  parent = element.parentNode;
  parentName = rb.String.new(parent.nodeName).downcase();

  switch (parentName) {
    case 'body' : 
      return null; 
      break;
    case 'tr' : 
      return parent; 
      break;
    default :
      return findHTMLRecordToClone(parent);
  }
}

function dataIslandRender(file, node) {

  var dynarex = Dynarex.new(file);
  recOriginal = findHTMLRecordToClone(node);
  
  if (recOriginal) {

    // get a reference to each element containing the datafld attribute
    var destNodes = [];
    
    dynarex.records.each(function(record){
    
      rec = recOriginal.cloneNode(true);

      rec.xpath('//span[@datafld]').each(function(span){
        destNodes[span.attribute('datafld').downcase()] = span;
      });

      for (field in destNodes){
        if (record.get(field) == nil) continue;
        destNodes[field].innerHTML = record.get(field).to_s();
      }    

      recOriginal.parentNode.appendChild(rec);
    });

    recOriginal.parentNode.removeChild(recOriginal);
  }

}

function dataIslandInit(){
  document.xpath("//object[@type='text/xml']").each( function(x){
    xpath = "//*[@datasrc='#" + x.attribute('id').to_s() + "']"
    document.xpath(xpath).each(function(island){
      dataIslandRender(x.attribute('data').to_s(), 
                       island.element('//span[@datafld]'));
    });
  });
}

dynarexDataIsland = {init: dataIslandInit}
//dynarexDataIsland.init();
//-- end of dynarex data islands