import { log } from "console";
import fs from "fs";
import xml2js from "xml2js";
// import { Command } from "commander";
import { format } from "path";
import * as prettier from "prettier";
import { parse } from "yaml";

// set prettier options
const prettierOptions = {
    tabWidth: 4,
    useTabs: false,
    xmlWhitespaceSensitivity: "preserve",
    plugins: ["@prettier/plugin-xml"],
    parser: "xml",
};

// parse config.yml
const config = parse(fs.readFileSync("config.yml", "utf-8"));
const objects = config.fieldPermissions;
const profileMethod = config.profiles.method;
const profiles = config.profiles.profiles;
let newFields = [];

for (const obj in objects) {
    objects[obj].forEach((item) => {
        let f = {
            editable: item.editable,
            field: `${obj}.${item.field}`,
            readable: item.readable,
        };
        newFields.push(f);
    });
}

async function main() {
    await updateFieldPermissions();
    console.log("done");
    // await formatProfiles();
}

main();

async function formatProfiles() {
    // for each profile, format the XML
    for (const profile of profiles) {
        // read file
        const text = fs.readFileSync(`profiles/${profile}.xml`, "utf-8");
        // format XML using prettier
        const formattedText = await prettier.format(text, prettierOptions);
        // write formatted XML back to the file
        fs.writeFileSync(`profiles/${profile}.xml`, formattedText, "utf-8");
    }
}

// update fieldPermissions in a profile
async function updateFieldPermissions() {
    // read XML from a file
    const file = fs.readFileSync(`profiles/${profiles[0]}.xml`, "utf-8");

    // parse XML to JS object
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(file);

    let fieldPermissions = result.Profile.fieldPermissions;

    // if field already exists, remove it from original array
    newFields.forEach((newF) => {
        fieldPermissions.forEach((oldF, index) => {
            if (oldF.field == newF.field) {
                fieldPermissions.splice(index, 1);
            }
        });
    });

    fieldPermissions.push(...newFields);

    // sort fieldPermissions by field name
    fieldPermissions.sort((a, b) => {
        const fieldA = a.field.toUpperCase();
        const fieldB = b.field.toUpperCase();
        if (fieldA < fieldB) {
            return -1;
        }
        if (fieldA > fieldB) {
            return 1;
        }
        return 0;
    });

    // build JS object to XML
    const builder = new xml2js.Builder({
        xmldec: {
            version: "1.0",
            encoding: "UTF-8",
            standalone: null,
        },
    });
    const xml = builder.buildObject(result);

    // write updated XML back to each profile
    profiles.forEach((profile) => {
        const profilePath = `profiles/${profile}.xml`;
        fs.writeFileSync(profilePath, xml, "utf-8");
    });
}
