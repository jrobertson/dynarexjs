// file: dynarex.js

// requires jaxle.js, and jfr.js

function dynarexNew(file) {

  var doc = Jaxle.new(file);
  var dynarex = new Object();
  
  dynarex.summary = doc.documentElement.xpath('summary/*').inject({},function(r,item){
    var h = Hash(item.nodeName, item.text().to_s() );
    return r.merge(h);
  });
  
  dynarex.records = doc.documentElement.xpath('records/*').map(function(rec){
    return rec.elements().inject({},function(r,field){
      return field.nodeType == 1 ? 
        r.merge(Hash(field.nodeName, field.text().to_s())) : nil;
    });
  });

  return dynarex;
}

Dynarex = {new: dynarexNew};

function findHTMLRecordToClone(element) {

  parent = element.parent();
  parentName = o(parent.nodeName).downcase().to_s();

  switch (parentName) {
    case 'body' : 
      return null; 
      break;
    case 'tr' :
    case 'li' : 
      return parent; 
      break;
    default :
      return findHTMLRecordToClone(parent);
  }
}

function findRange(page, rows_per_page, x){
  if (page != nil) {
    if (page.to_s() == 'all') {return nil;}
    else {pg = page.to_i();}
  }
  else
  {
    pg = 1;
  }
  var pg = (page != nil) ? page.to_i() : 1;
  var rpp = rows_per_page.to_i();
  x.setAttribute('range', (pg > 1) ? 
    (pg - 1) * rpp + '..' + (((pg - 1) * rpp ) + rpp - 1) : '0..' + (rpp - 1))
  return x.attribute('range');
}

function addToDestnodes(destNodes, key, htmlFragment) {
  if (destNodes[key]) {
    destNodes[key].push(htmlFragment);
  }
  else {
    destNodes[key] = [htmlFragment];
  }
}

function dataIslandRender(dynarex, x, node) {
  
  var sort_by = x.attribute('sort_by');
  var range = x.attribute('range');
  var rows_per_page = x.attribute('rows_per_page');
    
  recOriginal = findHTMLRecordToClone(node);
  
  if (recOriginal) {

    // get a reference to each element containing the datafld attribute

    
    records = dynarex.records;
        
    if (rows_per_page != nil && !rows_per_page.empty_q() ){
      var page = o(location.href).regex(/#page=(\d+|all)$/,1)      
      range = findRange(page, rows_per_page, x);
    }
    
    if (range != nil && range.length() > 0) {
      var i = range.match(/(\d+)(\.\.|,)(\d+)/).values_at(1,-1)
      records = dynarex.records.range(i.at(0).to_i(), i.at(-1).to_i());
    }

    if (sort_by != nil) {
      if (sort_by.regex(/^-/) == nil) {
        var recs = records.sort_by(function(record){ return record.get(sort_by.to_s()); });
      }
      else {
        var recs = records.sort_by(function(record){ 
          return record.get(sort_by.range(1,-1).to_s()); 
        }).reverse();
      }
    }
    else {
      var recs = records;
    }
    recs.each(function(record){    
      
      rec = recOriginal.deep_clone();
      var destNodes = [];
      
      rec.xpath('.//span[@class]|.//a[@class]').each(function(e){
        r = e.attribute('class').regex(/\{([^\}]+)\}$/,1);
        if (r != nil){
          addToDestnodes(destNodes, r.to_s(), e)
        }
      });    
            
      rec.xpath('.//object[@data]').each(function(e){
        r = e.attribute('data').regex(/\{([^\}]+)\}$/,1);
        if (r != nil){
          addToDestnodes(destNodes, r.to_s(), e)
        }
      });    
            
      rec.xpath('.//*[@datafld]').each(function(e){
        addToDestnodes(destNodes, e.attribute('datafld').downcase().to_s(), e)
      });

      // jr 12-Apr-2012 the statement below should now be removed
      rec.xpath('.//a[@name]').each(function(e){
        r = e.attribute('name').regex(/^\{([^\}]+)\}$/,1);
        if (r != nil){
          addToDestnodes(destNodes, r.to_s(), e)
        }
      });
                    
      rec.xpath('.//a[@href]').each(function(e){
        r = e.attribute('href').regex(/\{([^\}]+)\}/,1);
        if (r != nil){
          addToDestnodes(destNodes, r.to_s(), e)
        }
      });
      
      rec.xpath('.//button[@onclick]').each(function(e){
        r = e.attribute('onclick').regex(/\{([^\}]+)\}/,1);
        if (r != nil){
          addToDestnodes(destNodes, r.to_s(), e)
        }
      });      
      
      
      for (field in destNodes){
        
        if (record.get(field) == nil) continue;
              
        destNodes[field].forEach(function(e2) {
          
          //o2 = e2.to_object();
          
          switch (o(e2.nodeName).downcase().to_s()) {
            
            case 'span' :
              if (e2.attribute('class') != nil) {
                
                var classx = e2.attribute('class');
                if (classx.regex('{' + field) != nil){
                  var val = record.get(field).to_s();
                  new_class = classx.sub(/\{[^\}]+\}/,val).to_s();
                  e2.set_attribute('class', new_class);           
                }
                else if (e2.attribute('datafld') != nil) {
                  e2.innerHTML = record.get(field).to_s();
                }              
              }
              else if (e2.attribute('datafld') != nil) {
                e2.innerHTML = record.get(field).to_s();
              }
              break;
              
            case 'a' :

              if (e2.attribute('datafld') != nil) {
                e2.set_attribute('href', record.get(field).to_s());

                if (e2.attribute('class') != nil) {
                  var classx = e2.attribute('class');
                  if (classx.regex('{' + field) != nil){
                    var val = record.get(field).to_s();
                    new_class = classx.sub(/\{[^\}]+\}/,val).to_s();
                    e2.set_attribute('class', new_class);           
                  }
                }
              }
              else if (e2.attribute('name') != nil){
                e2.set_attribute('name', record.get(field).to_s());	    
              }
              else if (e2.attribute('href') != nil){
                
                var href = e2.attribute('href');
                if (href.regex(/\{/) != nil){
                  var val = record.get(field).to_s();
                  new_href = href.sub(/\{[^\}]+\}/,val).to_s();
                  e2.set_attribute('href', new_href);	    
                }
              }	    

              break;
            case 'img' :
              e2.set_attribute('src', record.get(field).to_s());
              break;	    
            case 'object' :
              if (e2.attribute('data') != nil) {
                
                var datax = e2.attribute('data');
                if (datax.regex('{' + field) != nil){
                  var val = record.get(field).to_s();
                  new_data = datax.sub(/\{[^\}]+\}/,val).to_s();
                  e2.set_attribute('data', new_data);           
                }
              }
              break;
            case 'button' :
              if (e2.attribute('onclick') != nil) {
                
                var onclick = e2.attribute('onclick');
                if (onclick.regex('{' + field) != nil){
                  var val = record.get(field).to_s();
                  new_data = onclick.sub(/\{[^\}]+\}/,val).to_s();
                  e2.set_attribute('onclick', new_data);           
                }
              }
              break;              
          }
        });
      }    
                  
      recOriginal.parent().append(rec);
    });

    //recOriginal.parentNode.removeChild(recOriginal);
    recOriginal.delete();
  }

}

function dataIslandInit(){
  document.xpath("//object[@type='text/xml']").each( function(x){

    var dynarex = Dynarex.new(x.attribute('data').to_s());
    var order = x.attribute('order');
    
    x.dynarex = {};
    x.dynarex.records = dynarex.records;
    if (order != nil && order.regex(/^asc|desc|ascending|descending$/)){      
      if (order.regex(/^desc|descending$/) != nil) x.dynarex.records = dynarex.records.reverse();
    }    
    
    var datactl = '#' + x.attribute('id').to_s()
    xpath = "//*[@datasrc='" + datactl + "']";
    
    document.xpath(xpath).each(function(island){
      
      island.template = island.deep_clone();
      dataIslandRender(x.dynarex, x, island.element('.//*[@datafld]'));
      
      var raw_page = o(location.href).regex(/#page=(\d+)$/,1)
      var pg = raw_page == nil ? 1 : raw_page.to_i()      
      if (island.parent().element("div[@datactl]") != nil) {
      refreshRecordControls(pg, document.element("//*[@datactl='" + datactl + "']/span/button"));
      }
    });
  });
}

function dataIslandRefresh(){
  document.xpath("//object[@type='text/xml']").each( function(x){    
    
    xpath = ".//*[@datasrc='#" + x.attribute('id').to_s() + "']";    
    
    document.xpath(xpath).each(function(prev_island){
      
      var island = prev_island.template;
      island.template = island.deep_clone();
      prev_island.parent().append(island);
      prev_island.delete();
      dataIslandRender(x.dynarex, x, island.element('//*[@datafld]'));
      
    });
  });
}


dynarexDataIsland = {init: dataIslandInit, refresh: dataIslandRefresh}
//dynarexDataIsland.init();
//-- end of dynarex data islands

// -- start of UI functions ---
  function gotoPage(pg, btn){

    var href = o(location.href).sub(/#page=(\d+|all)$/,'').to_s();
    
    location.href = href + '#page=' + pg;
    dynarexDataIsland.refresh();
    refreshRecordControls(pg, btn);
  }

  function next(btn){    
    var raw_page = o(location.href).regex(/#page=(\d+)$/,1)
    var pg = raw_page == nil ? 2 : raw_page.succ().to_i()
    gotoPage(pg, btn);
  }

  function previous(btn){
    var raw_page = o(location.href).regex(/#page=(\d+)$/,1)
    var pg = raw_page.to_i() - 1;
    gotoPage(pg, btn);
  }

  function refreshRecordControls(pg, btn){

    var datactl = btn.parent().parent().attribute('datactl').range(1,-1).to_s();
    var x = document.element("//object[@id='" + datactl + "']");
    var e = document.element("//*[@datactl='#" + datactl + "']/span");
    var btnPrevious = e.element("button[@id='previous']");
    var btnNext = e.element("button[@id='next']");
    var btnPage1 = e.element("button[@id='page1']");

    // -- next button --   
    var count = x.dynarex.records.count();
    var rpp = x.attribute('rows_per_page').to_i();
    (pg * rpp > count) ? btnNext.setAttribute('disabled','disabled') : 
      btnNext.removeAttribute('disabled');
    // -- end of next button

    // -- previous button --
    if (pg > 1) {
      btnPrevious.removeAttribute('disabled');
      btnPage1.removeAttribute('disabled'); 
    }
    else {
      btnPrevious.setAttribute('disabled','disabled');
      btnPage1.setAttribute('disabled','disabled');
    }
    // -- end of previous button

    if (btnNext.attribute('disabled').to_s() == 'disabled' &&
	btnPrevious.attribute('disabled').to_s() == 'disabled') {
      btn.parent().parent().set_attribute('style','display: none');
    }
    else {
      document.getElementById('debug').innerHTML = 'page ' + pg;
    }
  }
  
  function showAllRecords(btn){

    gotoPage('all', btn);    

    btn.parent().element("button[@id='indi']").set_attribute('style','display: block');
    btn.set_attribute('style','display: none');
    btn.parent().parent().element("span[@class='rctl']").set_attribute('style','display: none');
    
  }
  
  function showIndividualPages(btn){

    btn.parent().parent().element("span[@class='rctl']").set_attribute('style','display: block');
    btn.parent().element("button[@id='all']").set_attribute('style','display: block');
    btn.set_attribute('style','display: none');
    
    gotoPage(1, btn);     
  }
// -- end of UI functions ---
