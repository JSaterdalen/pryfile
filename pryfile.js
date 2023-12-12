import fs from "fs";
import xml2js from "xml2js";
// import { Command } from "commander";
import * as prettier from "prettier";
import { parse } from "yaml";

const profileDir = "force-app/main/default/profiles";

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
const profiles = config.profiles.profiles;
const profileMethod = config.profiles.method;

// build newFields array
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

// if newFields isn't empty, run main()
if (newFields.length > 0) {
    main();
}

async function main() {
    await updateProfiles();
}

// run prettier on selected profiles
async function formatProfiles() {
    // for each profile, format the XML
    for (const profile of profiles) {
        const profilePath = `${profileDir}/${profile}.xml`;
        // read file
        const text = fs.readFileSync(profilePath, "utf-8");
        // format XML using prettier
        const formattedText = await prettier.format(text, prettierOptions);
        // write formatted XML back to the file
        fs.writeFileSync(profilePath, formattedText, "utf-8");
    }
}

// modify selected profiles
async function updateProfiles() {
    for (const profile of profiles) {
        // read XML from a file
        const profilePath = `${profileDir}/${profile}.xml`;
        const file = fs.readFileSync(profilePath, "utf-8");

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

        // write updated XML back to profile
        fs.writeFileSync(profilePath, xml, "utf-8");
    }

    // format all profiles
    await formatProfiles();
}
