#!/usr/bin/env node

import fs from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";
import { error, say, success } from "../chalk.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configFile = `${__dirname}/../../pryfilerc.example`;

function makeConfig() {
    // fs.copyFileSync(configFile, ".pryfilerc");

    const config = YAML.parse(fs.readFileSync(configFile, "utf-8"));
    config.profiles.profiles = [];

    // get list of profiles from force-app/main/default/profiles
    const profiles = fs.readdirSync("force-app/main/default/profiles");
    profiles.forEach((profile) => {
        if (profile.endsWith(".profile-meta.xml")) {
            config.profiles.profiles.push(
                profile.replace(".profile-meta.xml", ""),
            );
        }
    });

    fs.writeFileSync(".pryfilerc", YAML.stringify(config));

    success("Created .pryfilerc");
    say("Please edit .pryfilerc to your liking.");
}

export { makeConfig };
