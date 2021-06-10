const fs = require('fs');
const path = require('path');
const marked = require("marked");
const jsdom = require("jsdom");
const axios = require("axios");
const { JSDOM } = jsdom;

const mdFiles = [];
const NO_MD_FILES = "Path not containing mdFiles";

const searchRecursive = (mdFilesPath) => new Promise((resolve) => {
  if(path.extname(mdFilesPath) === ".md"){
    mdFiles.push(mdFilesPath)
  }else{
    const files = fs.readdirSync(mdFilesPath)
      files.forEach(file => {
        dirInner = path.resolve(mdFilesPath, file);
        var stat = fs.statSync(dirInner);
        if(path.extname(dirInner) === ".md") mdFiles.push(dirInner);
        else if (stat.isDirectory()) searchRecursive(dirInner)
      });
  }
  resolve(mdFiles)  
});

const getLinks = (route) => new Promise((resolve, reject) => {
    const relPath = path.relative(__dirname, route);
    fs.readFile(route, 'utf8', (err, data) => {
    if (err) reject(err);
    const fileLinks = [];
    const html = marked(data);
    const dom = new JSDOM(html);
    const links = dom.window.document.getElementsByTagName("a");
        for(i = 0; i < links.length; i++){
          const link = links[i].href;
          const text = links[i].textContent
          if (link.startsWith('http')) 
          fileLinks.push({
            href: link,
            text: text,
            file: relPath
          })
        } 
        // const reg = /\[[\S](.)+\]\(https?:\/\/(\w+\.\w+)+(\/[\w+\-#¿?_.-=]+)*\/?\)/gi
        // resolve(data.match(reg));
    resolve(fileLinks);
    });
})

const httpRequest = (linkObj) => new Promise((resolve) => {
  const url = linkObj.href;
  const options = {
    headers: {'Access-Control-Allow-Origin' : '*'}
  };
    axios.get(url, options)
    .then((response) => {
        linkObj.status = response.status,
        linkObj.ok =  "OK"
    })
    .catch((error) => {
      if (error.response){
        linkObj.status = error.response.status,
        linkObj.ok = "Fail"
      }else{
        linkObj.status = error.code,
        linkObj.ok = "Fail"
      }
    })
    .then(()=>{
      resolve(linkObj)
    })
})
    
function createResponse(mdLinks){
  const allHttpResponse = [];
  mdLinks.map((element) => {
    allHttpResponse.push(httpRequest(element))
  })
  return Promise.all(allHttpResponse)
  .then((httpResponse) => httpResponse)
  .catch((error) => error);
}

function mdLinks(filesPath, options){
  return new Promise((resolve, reject) => {
    options = options || { validate: false }
    const absPath = path.isAbsolute(filesPath) ? filesPath : path.resolve(filesPath);
    const allLinks = [];
    fs.access(absPath, (err) => {
        if(err) reject(`${absPath} Is not a valid path`);
        else 
          fs.stat(absPath, (err, stats) => {
            if (err) console.error(err)
            if (stats.isFile() && path.extname(absPath) !== ".md") 
              reject(`${absPath} Does not contain md files`)
            else 
              searchRecursive(absPath).then((mdFiles) => {
                if(mdFiles.length <= 0) reject(new Error(NO_MD_FILES))
                mdFiles.map((mdFile) => {
                  allLinks.push(getLinks(mdFile))
                })
                Promise.all(allLinks)
                  .then(response => {
                    const fnlResponse = response.flat()
                    !options.validate ? resolve(fnlResponse) : resolve(createResponse(fnlResponse))
                  })
              })
          })
    });
  });
}
module.exports = { mdLinks };