import chalk from "chalk";

function say(message) {
    console.log(chalk.italic(message));
}

function success(message) {
    console.log(chalk.green(message));
}

function error(message) {
    console.log(chalk.bgRed.black(message));
}

export { error, say, success };
