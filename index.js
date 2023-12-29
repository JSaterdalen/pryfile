#!/usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import * as prettier from "prettier";
import xml2js from "xml2js";
import { parse } from "yaml";
import { error, say, success } from "./src/chalk.js";
import { makeConfig } from "./src/commands/config.js";

const profileDir = "force-app/main/default/profiles";
const configFile = ".pryfilerc";
let config = {};
let objects = [];
let profiles = [];
let newFields = [];

// set prettier options
const prettierOptions = {
    tabWidth: 4,
    useTabs: false,
    xmlWhitespaceSensitivity: "preserve",
    plugins: ["@prettier/plugin-xml"],
    parser: "xml",
    printWidth: 1000,
};

const program = new Command();
program
    .command("config")
    .description("Create example config file in the current project")
    .action(makeConfig);

program.description("Apply changes to profiles").action(main);

program
    .command("format")
    .description("Format selected profiles")
    .option("-a, --all", "Format all profiles, regardless of config")
    .action((options) => {
        format(options);
    });

program.option("-s, --sort", "Sort the entire file alphabetically.");

program.parse();

const options = program.opts();

async function main() {
    getSelectedProfiles();
    getFieldPermissions();
    await updateProfiles();
    success("Profiles have been updated!");
}

function format(options) {
    if (options.all) {
        // get list of profiles from force-app/main/default/profiles
        profiles = fs.readdirSync("force-app/main/default/profiles");
        // for each profile, remove .profile-meta.xml from the end
        profiles.forEach((profile, index) => {
            profiles[index] = profile.replace(".profile-meta.xml", "");
        });
    } else {
        getSelectedProfiles();
    }
    formatProfiles();
    success("Profiles have been formatted!");
}

function getSelectedProfiles() {
    checkConfig();
    if (Object.keys(config).length === 0 && config.constructor === Object) {
        config = parse(fs.readFileSync(configFile, "utf-8"));
    }
    profiles = config.profiles.profiles;
    if (!profiles) {
        error("No profiles specified in config.");
        process.exit(1);
    }
}

function getFieldPermissions() {
    checkConfig();
    if (Object.keys(config).length === 0 && config.constructor === Object) {
        config = parse(fs.readFileSync(configFile, "utf-8"));
    }
    objects = config.fieldPermissions;
    if (!objects) {
        error("No objects found in config.");
        process.exit(1);
    }

    // build newFields array
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
}

function checkConfig() {
    if (!fs.existsSync(configFile)) {
        error("No config file found.");
        say("Please run `pryfile config` to create an example.");
        process.exit(1);
    }
}

// run prettier on selected profiles
async function formatProfiles() {
    // for each profile, format the XML
    for (const profile of profiles) {
        const profilePath = `${profileDir}/${profile}.profile-meta.xml`;
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
    console.log("Updating profiles...");
    for (const profile of profiles) {
        // read XML from a file
        const profilePath = `${profileDir}/${profile}.profile-meta.xml`;
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

        if (options.sort) {
            fieldPermissions.push(...newFields);
            sortArray(fieldPermissions);
        } else {
            for (const newField of newFields) {
                binarySearchInsert(fieldPermissions, newField);
            }
        }

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

function binarySearchInsert(array, field) {
    let start = 0;
    let end = array.length;

    while (start < end) {
        const mid = Math.floor((start + end) / 2);
        if (field.field < array[mid].field) {
            end = mid;
        } else {
            start = mid + 1;
        }
    }

    array.splice(start, 0, field);
}

function sortArray(fieldPermissions) {
    // sort fieldPermissions by field name
    fieldPermissions.sort((a, b) => {
        const fieldA = a.field;
        const fieldB = b.field;
        if (fieldA < fieldB) {
            return -1;
        }
        if (fieldA > fieldB) {
            return 1;
        }
        return 0;
    });
}

export { main };
