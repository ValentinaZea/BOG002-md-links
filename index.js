// module.exports = () => {
//   AQUÍ FUNCIÓN MDLINKS
  

// };
const fs = require('fs');
const path = require('path');
const marked = require("marked");
const jsdom = require("jsdom");
const axios = require("axios");
const { JSDOM } = jsdom;

const mdFiles = [];
const NO_MD_FILES = "Path not containing mdFiles";

const searchRecursive = (dir) => new Promise((resolve) => {
  const files = fs.readdirSync(dir)
      files.forEach(file => {
        dirInner = path.resolve(dir, file);
        var stat = fs.statSync(dirInner);
        if(path.extname(dirInner) === ".md") mdFiles.push(dirInner);
        else if (stat.isDirectory()) searchRecursive(dirInner)
      });
    resolve(mdFiles)  
});

const getLinks = (route) => new Promise((resolve, reject) => {
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
            file: route
          })
        } 
        // const reg = /\[[\S](.)+\]\(https?:\/\/(\w+\.\w+)+(\/[\w+\-#¿?_.-=]+)*\/?\)/gi
        // resolve(data.match(reg));
    resolve(fileLinks);
    });
})

  const httpRequest = (linkObj) => new Promise((resolve) => {
    const url = linkObj.href;
      axios.get(url)
      .then((response) => {
        httpResponse = {
          status: response.status,
          ok: "OK"
        }
      })
      .catch((error) => {
        if (error.response)
        httpResponse = {
          status: error.response.status,
          ok: "Fail"
        }
      })
      .then(()=>{
        Object.assign(linkObj, httpResponse)
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
      fs.access(filesPath, (err) => {
        if (err) reject(new Error("No such file or directory"));
        const absPath = path.isAbsolute(filesPath) ? filesPath : path.resolve(filesPath);
        const allLinks = [];
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
  }
  mdLinks('mdfilesTest', {validate: true})
  .then((data)=> {
    console.log(data)
  });

  
  

  

  

