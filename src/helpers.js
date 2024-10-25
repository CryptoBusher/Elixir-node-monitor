import fs from "fs";


export const txtToArray = (filePath) => {
    return fs.readFileSync(filePath, 'utf8').toString().replace(/\r\n/g, '\n').split('\n').filter(n => n);
};


export const extractUniqueAppVersions = (data) => {
    const versions = [];
    for (const item of data) {
        if (item?.data?.app_version) {
            versions.push(item.data.app_version);
        }
    }

    const uniqueVersions = [...new Set(versions)];

    return uniqueVersions;
}


export const sleep = (sec, log=false) => {
    if (log) {
        logger.info(`Sleeping ${sec} seconds...`);
    }

	return new Promise(resolve => setTimeout(resolve, sec * 1000));
};