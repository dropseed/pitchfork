#!/usr/bin/env node
const lunr = require("lunr");
const glob = require("glob");
const fs = require("fs");
const cheerio = require("cheerio");
const path = require("path");
const program = require("commander");

function pathToURL(p) {
  if (path.basename(p, ".html") !== "index") {
    return "/" + p;
  }
  return "/" + p.split(path.sep).slice(0, -1).join("/") + "/";
}

program
  .version(require('./package.json').version)

program
  .command("index")
  .description("create an index for a static site directory")
  .arguments("<dir>")
  .requiredOption('-c, --content-selector <selector>', 'DOM selector for your main content area')
  .option('-i, --index-filename <path>', 'Filename to save the index JSON', "search-index.json")
  .option('--content-title-selector <selector>', 'DOM selector for the title of your content area', "h1")
  .option('--content-headings-selector <selector>', 'DOM selector for the additional headings of your content area', "h2")
  .option('--glob <pattern>', 'Files to index in the given directory', "**/*.html")
  .action(function (dir) {
    const indexFilename = program.indexFilename
    const contentSelector = program.contentSelector
    const contentTitleSelector = program.contentTitleSelector
    const contentHeadingsSelector = program.contentHeadingsSelector
    const globPattern = program.glob

    let outputData = {
      pages: {},
      lunr: null,
    };

    glob(globPattern, { cwd: dir }, function (er, paths) {
      console.log(`Found ${paths.length} files`);

      paths.forEach((p) => {
        console.log("- " + p);
        const filePath = path.join(dir, p);
        const data = fs.readFileSync(filePath, "utf8");
        const $ = cheerio.load(data);

        const content = $(contentSelector);

        const title = content.find(contentTitleSelector);

        let headings = [];
        content.find(contentHeadingsSelector).each((_, el) => {
          headings.push({
            text: $(el).text().trim(),
            id: $(el).attr("id"),
          });
        });

        const url = pathToURL(p);
        outputData.pages[url] = {
          title: $(title.get(0)).text().trim(),
          headings: headings,
          text: content.text().trim(),
        };
      });

      outputData.lunr = lunr(function () {
        this.ref("url");
        this.field("title");
        this.field("headings");
        this.field("text");
        this.metadataWhitelist = ["position"];

        Object.entries(outputData.pages).forEach(function ([url, data]) {
          this.add({
            url: url,
            ...data,
          });
        }, this);
      });

      const indexOutput = JSON.stringify(outputData, null, 2);
      const indexPath = path.join(dir, indexFilename);
      fs.writeFileSync(indexPath, indexOutput);
      console.log("\nIndex written to " + indexPath);
    });
  })

program.parse(process.argv);
