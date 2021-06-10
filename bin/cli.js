#!/usr/bin/env node
const [,, ... args] = process.argv;
const path = args[0];

const { walkTokens } = require("marked");
const { exec } = require('child_process');
const yargs = require("yargs");
const { mdLinks } = require("../index");
const options = yargs

.usage("Usage: md-links <path-to-file> [options]")
.option("validate", { 
    describe: "Makes an HTTP request to validate the links", 
    type: "boolean",
    demandOption: false 
})
.option("stats", {
    alias: "st",
    describe: "Outputs basic statistics about the links",
    type: "boolean",
    demandOption: false 
})
.help(true)
.argv;
if (!path){
    console.error("Path not provided!"); 
    // exec('mdlinks --help', (error, stdout, stderr) => {
    // if (error) {
    //     console.error(`exec error: ${error}`);
    //     return;
    // }
    // console.log(`stdout: ${stdout}`);
    // console.error(`stderr: ${stderr}`);
    // });
} else {
    if (args.length == 1) {
        mdLinks(path).then((data)=> {
            data.forEach(element => {
                console.table({File: element.file, href: element.href, text: element.text});
            });
        })
        .catch(console.error);
    }
    if (yargs.argv.validate) {
        mdLinks(path, {validate: true})
        .then((data)=> {
            data.forEach(element => {
                // console.log(element.file, "", element.href, "", , "", , "", element.text)
                console.table({File: element.file, href: element.href, ok:element.ok, status:element.status, text: element.text});
            });
        })
        .catch(console.error);
    }
    if (yargs.argv.stats) {
        mdLinks(path)
        .then((data)=> {
            const total = data.length;
            const uniqueLinks = [...new Set(data.map((element) => element.href))];
            // console.table('Total:', total, '\nUnique:', uniqueLinks.length)
            console.table({Total: total, Unique: uniqueLinks.length});
        })
        .catch(console.error);
    }
    if (yargs.argv.validate && yargs.argv.stats){
        mdLinks(path, {validate: true})
        .then((data)=> {
            const total = data.length;
            const uniqueLinks = [...new Set(data.map((element) => element.href))];
            const broken = data.map(element => element.status !== 200)
            // console.table('Total:', total, '\nUnique:', uniqueLinks.length)
            console.table(
                { Total: total, Unique: uniqueLinks.length, Broken: broken.length}
                );
        })
        .catch(console.error);
    }
}
