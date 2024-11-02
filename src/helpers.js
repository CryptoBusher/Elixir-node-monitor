import fs from "fs";


export const txtToArray = (filePath) => {
    return fs.readFileSync(filePath, 'utf8').toString().replace(/\r\n/g, '\n').split('\n').filter(n => n);
};


export const extractUniqueAppVersions = (data) => {
    const versions = [];
    let versionsReport = 'VERSIONS REPORT:\n';
    for (const item of data) {
        if (item?.data?.app_version) {
            versionsReport += `${item.name} - ${item.data.app_version}\n`;
            versions.push(item.data.app_version);
        }
    }

    const uniqueVersions = [...new Set(versions)];
    return [uniqueVersions, versionsReport];
}


export const sleep = (sec, log=false) => {
    if (log) {
        logger.info(`Sleeping ${sec} seconds...`);
    }

	return new Promise(resolve => setTimeout(resolve, sec * 1000));
};