import { localhostMagentoRootExec } from '../utils/console';
import { Listr } from 'listr2';
import configFile from '../../config/settings.json'

class MagentoConfigureTask {
    private configureTasks = [];

    configure = async (list: any, config: any) => {
        await this.addTasks(list, config);
        return list;
    }

    // Add tasks
    addTasks = async (list: any, config: any) => {
        list.add(
            {
                title: 'Configuring Magento for development usage',
                task: (ctx: any, task: any): Listr =>
                task.newListr(
                    this.configureTasks
                )
            }
        )

        this.configureTasks.push(
            {
                title: "Replacing URL's and doing some preperation for development",
                task: async (): Promise<void> => {
                    var dbQuery = '';
                    // Delete queries
                    var dbQueryRemove = "DELETE FROM core_config_data WHERE path LIKE 'web/cookie/cookie_domain';",
                        dbQueryRemove = dbQueryRemove + "DELETE FROM core_config_data WHERE path LIKE 'dev/static/sign';",
                        dbQueryRemove = dbQueryRemove + "DELETE FROM core_config_data WHERE path LIKE '%smtp%';",
                        dbQueryRemove = dbQueryRemove + "DELETE FROM core_config_data WHERE path LIKE 'admin/url/use_custom';",
                        dbQueryRemove = dbQueryRemove + "DELETE FROM core_config_data WHERE path LIKE 'admin/url/use_custom_path';",
                        dbQueryRemove = dbQueryRemove + "DELETE FROM core_config_data WHERE path LIKE 'web/unsecure/base_static_url';",
                        dbQueryRemove = dbQueryRemove + "DELETE FROM core_config_data WHERE path LIKE 'web/unsecure/base_media_url';",
                        dbQueryRemove = dbQueryRemove + "DELETE FROM core_config_data WHERE path LIKE 'web/unsecure/base_link_url';",
                        dbQueryRemove = dbQueryRemove + "DELETE FROM core_config_data WHERE path LIKE 'web/unsecure/base_url';",
                        dbQueryRemove = dbQueryRemove + "DELETE FROM core_config_data WHERE path LIKE 'web/secure/base_static_url';"
                        dbQueryRemove = dbQueryRemove + "DELETE FROM core_config_data WHERE path LIKE 'web/secure/base_media_url';",
                        dbQueryRemove = dbQueryRemove + "DELETE FROM core_config_data WHERE path LIKE 'web/secure/base_link_url';",
                        dbQueryRemove = dbQueryRemove + "DELETE FROM core_config_data WHERE path LIKE 'web/secure/base_url';",
                        dbQueryRemove = dbQueryRemove + "DELETE FROM core_config_data WHERE path LIKE '%ceyenne%';";

                    // Update queries
                    var dbQueryUpdate = "UPDATE core_config_data SET value = '0' WHERE path = 'web/secure/use_in_frontend';",
                        dbQueryUpdate = dbQueryRemove + "UPDATE core_config_data SET value = '0' WHERE path = 'web/secure/use_in_adminhtml';"

                    let baseUrl = 'http://' + config.settings.magentoLocalhostDomainName + '/';

                    // Insert queries
                    var dbQueryInsert = "INSERT INTO core_config_data (scope, scope_id, path, value) VALUES ('default', '0', 'web/unsecure/base_static_url', '{{unsecure_base_url}}static/');",
                        dbQueryInsert = dbQueryInsert + "INSERT INTO core_config_data (scope, scope_id, path, value) VALUES ('default', '0', 'web/unsecure/base_media_url', '{{unsecure_base_url}}media/');",
                        dbQueryInsert = dbQueryInsert + "INSERT INTO core_config_data (scope, scope_id, path, value) VALUES ('default', '0', 'web/unsecure/base_link_url', '{{unsecure_base_url}}');",
                        dbQueryInsert = dbQueryInsert + "INSERT INTO core_config_data (scope, scope_id, path, value) VALUES ('default', '0', 'web/secure/base_static_url', '{{secure_base_url}}static/');",
                        dbQueryInsert = dbQueryInsert + "INSERT INTO core_config_data (scope, scope_id, path, value) VALUES ('default', '0', 'web/secure/base_media_url', '{{secure_base_url}}media/');",
                        dbQueryInsert = dbQueryInsert + "INSERT INTO core_config_data (scope, scope_id, path, value) VALUES ('default', '0', 'web/secure/base_link_url', '{{secure_base_url}}');",
                        dbQueryInsert = dbQueryInsert + "INSERT INTO core_config_data (scope, scope_id, path, value) VALUES ('default', '0', 'web/unsecure/base_url', '" + baseUrl + "');",
                        dbQueryInsert = dbQueryInsert + "INSERT INTO core_config_data (scope, scope_id, path, value) VALUES ('default', '0', 'web/secure/base_url', '" + baseUrl + "');",
                        dbQueryInsert = dbQueryInsert + "INSERT INTO core_config_data (scope, scope_id, path, value) VALUES ('default', '0', 'dev/static/sign', '0');";

                    // Build up query
                    dbQuery = dbQuery + dbQueryRemove + dbQueryUpdate + dbQueryInsert;

                    // Set import domain for final message on completing all tasks
                    config.finalMessages.importDomain = baseUrl;

                    await localhostMagentoRootExec(`${config.settings.magerun2CommandLocal} db:query "${dbQuery}"`, config);
                }
            }
        );

        this.configureTasks.push(
            {
                title: "Configuring ElasticSearch 7/MySQL",
                task: async (): Promise<void> => {
                    let dbQuery = '';
                    let dbQueryUpdate = ''
                    let jsonEngineCheck = ''; // Types supported: 'elasticsearch7', 'amasty_elastic';

                    let engineCheck = await localhostMagentoRootExec(`${config.settings.magerun2CommandLocal} config:store:get "catalog/search/engine" --format=json`, config);
                    // @ts-ignore
                    if (engineCheck.length > 0) {
                        try {
                            const obj = JSON.parse(<string>engineCheck);
                            if (obj && typeof obj === `object`) {
                                jsonEngineCheck = JSON.parse(engineCheck)[0].Value;
                            }
                        } catch (err) {}
                    }


                    // Configure Elastic to use version 7 if engine is not mysql
                    if (jsonEngineCheck.indexOf("mysql") == -1) {
                        // Update queries
                        dbQueryUpdate = `UPDATE core_config_data SET value = 'localhost' WHERE path LIKE '%_server_hostname%';`,
                            dbQueryUpdate = dbQueryUpdate + `UPDATE core_config_data SET value = '${configFile.general.elasticsearchPort}' WHERE path LIKE '%_server_port%';`,
                            dbQueryUpdate = dbQueryUpdate + `UPDATE core_config_data SET value = '0' WHERE path LIKE '%_enable_auth%';`;

                        // Amasty elasticsearch check
                        if (jsonEngineCheck.indexOf("amasty_elastic") !== -1) {
                            dbQueryUpdate = dbQueryUpdate + `UPDATE core_config_data SET value = '${config.settings.currentFolderName}_development_' WHERE path LIKE '%_index_prefix%';`,
                            dbQueryUpdate = dbQueryUpdate + `UPDATE core_config_data SET value = '${config.settings.currentFolderName}_development_' WHERE path LIKE '%elastic_prefix%';`,
                            dbQueryUpdate = dbQueryUpdate + `UPDATE core_config_data SET value = 'amasty_elastic' WHERE path = 'catalog/search/engine';`,
                            dbQueryUpdate = dbQueryUpdate + `UPDATE core_config_data SET value = 'amasty_elastic' WHERE path = 'amasty_elastic/connection/engine';`;
                        } else {
                            // Standard elasticsearch7 settings
                            dbQueryUpdate = dbQueryUpdate + `UPDATE core_config_data SET value = '${config.settings.currentFolderName}_development' WHERE path LIKE '%_index_prefix%';`,
                            dbQueryUpdate = dbQueryUpdate + `UPDATE core_config_data SET value = '${config.settings.currentFolderName}_development_' WHERE path LIKE '%elastic_prefix%';`,
                            dbQueryUpdate = dbQueryUpdate + `UPDATE core_config_data SET value = 'elasticsearch7' WHERE path = 'catalog/search/engine';`;
                        }

                        // Build up query
                        dbQuery = dbQueryUpdate;

                        await localhostMagentoRootExec(`${config.settings.magerun2CommandLocal} db:query "${dbQuery}"`, config);
                        config.settings.elasticSearchUsed = true;
                    }
                }
            }
        );

        this.configureTasks.push(
            {
                title: 'Creating an admin user',
                task: async (): Promise<void> => {
                    // Remove all current admin users
                    var dbQuery = `DELETE FROM admin_user; ALTER TABLE admin_user AUTO_INCREMENT = 1;`;
                    await localhostMagentoRootExec(`${config.settings.magerun2CommandLocal} db:query "${dbQuery}"`, config);

                    // Create a new admin user
                    await localhostMagentoRootExec(`${config.settings.magerun2CommandLocal} admin:user:create --admin-user=${configFile.magentoBackend.adminUsername} --admin-password=${configFile.magentoBackend.adminPassword} --admin-email=${configFile.magentoBackend.adminEmailAddress} --admin-firstname=Firstname --admin-lastname=Lastname`, config);
                }
            }
        );

        this.configureTasks.push(
            {
                title: 'Disable reCAPTCHA',
                task: async (): Promise<void> => {
                    await localhostMagentoRootExec(`${config.settings.magerun2CommandLocal} config:store:set msp_securitysuite_recaptcha/frontend/enabled 0`, config);
                    await localhostMagentoRootExec(`${config.settings.magerun2CommandLocal} config:store:set msp_securitysuite_recaptcha/backend/enabled 0`, config);
                    await localhostMagentoRootExec(`${config.settings.magerun2CommandLocal} config:store:set admin/captcha/enable 0`, config);
                    await localhostMagentoRootExec(`${config.settings.magerun2CommandLocal} config:store:set customer/captcha/enable 0`, config);
                    await localhostMagentoRootExec(`${config.settings.magerun2CommandLocal} config:store:set recaptcha/general/enabled 0`, config);
                    await localhostMagentoRootExec(`${config.settings.magerun2CommandLocal} config:store:set msp_securitysuite_recaptcha/frontend/enabled 0`, config);
                    await localhostMagentoRootExec(`${config.settings.magerun2CommandLocal} config:store:set msp_securitysuite_recaptcha/frontend/enabled 0`, config);
                }
            }
        );

        this.configureTasks.push(
            {
                title: 'Configuring cache',
                task: async (): Promise<void> => {
                    await localhostMagentoRootExec(`${config.settings.magerun2CommandLocal} config:store:set system/full_page_cache/caching_application 1`, config);
                }
            }
        );

        this.configureTasks.push(
            {
                title: 'Creating a dummy customer on every website',
                task: async (): Promise<void> => {
                    // Create new dummy customers for all websites
                    // Get all websites
                    let allWebsites = await localhostMagentoRootExec(`${config.settings.magerun2CommandLocal} sys:website:list --format=json`, config);
                    allWebsites = JSON.parse(<string>allWebsites);

                    // @ts-ignore
                    for (const [key, value] of Object.entries(allWebsites)) {
                        // @ts-ignore
                        let code = value.code;
                        let test = `${config.settings.magerun2CommandLocal} customer:create ${configFile.magentoBackend.adminEmailAddress} ${configFile.magentoBackend.adminPassword} Firstname Lastname ${code}`;
                        console.log(test);
                        process.exit;
                        //await localhostMagentoRootExec(`${config.settings.magerun2CommandLocal} customer:create ${configFile.magentoBackend.adminEmailAddress} ${configFile.magentoBackend.adminPassword} Firstname Lastname ${code}`, config, true);
                    }
                }
            }
        );

        this.configureTasks.push(
            {
                title: "Configuring Wordpress settings within Magento",
                task: async (): Promise<void> => {
                    // If wordpress is imported, we do nothing
                    if (config.settings.wordpressImport && config.settings.wordpressImport == 'yes') {
                        return;
                    } else {
                        let dbQuery = '';
                        // Remove queries
                        let dbQueryRemove = "DELETE FROM core_config_data WHERE path LIKE 'wordpress/setup/enabled';";

                        // Insert commands
                        let dbQueryInsert = "INSERT INTO core_config_data (scope, scope_id, path, value) VALUES ('default', '0', 'wordpress/setup/enabled', '0');";

                        // Build up query
                        dbQuery = dbQuery + dbQueryRemove + dbQueryInsert;

                        await localhostMagentoRootExec(`${config.settings.magerun2CommandLocal} db:query "${dbQuery}"`, config);
                    }
                }
            }
        );

        this.configureTasks.push(
            {
                title: 'Synchronizing module versions on localhost',
                task: async (): Promise<void> => {
                    // Downgrade module data in database
                    await localhostMagentoRootExec(`${config.settings.magerun2CommandLocal} sys:setup:downgrade-versions; ${config.settings.magerun2CommandLocal} setup:upgrade`, config);
                }
            }
        );

        if (config.settings.runCommands && config.settings.runCommands == 'yes') {
            this.configureTasks.push(
                {
                    title: 'Running project commands',
                    task: async (): Promise<void> => {

                        // Magerun2 commands
                        if (config.settings.magerun2Command && config.settings.magerun2Command.length > 0) {
                            await localhostMagentoRootExec(config.settings.magerun2Command, config, false, true);
                        }

                        // Database queries
                        if (config.settings.databaseCommand && config.settings.databaseCommand.length > 0) {
                            let dbQuery = config.settings.databaseCommand.replace(/'/g, '"');
                            await localhostMagentoRootExec(`${config.settings.magerun2CommandLocal} db:query '` + dbQuery + `'`, config, false, true);
                        }
                    }
                }
            );
        }

        this.configureTasks.push(
            {
                title: 'Removing generated code',
                task: async (): Promise<void> => {
                    // Remove generated code
                    await localhostMagentoRootExec("rm -rf generated/code", config);
                }
            }
        );

        this.configureTasks.push(
            {
                title: 'Reindexing Magento',
                task: async (): Promise<void> => {
                    // Reindex data, only when elastic is used
                    if (config.settings.elasticSearchUsed) {
                        await localhostMagentoRootExec(`${config.settings.magerun2CommandLocal} index:reindex catalog_category_product catalog_product_category catalog_product_price cataloginventory_stock`, config);
                    }
                }
            }
        );

        this.configureTasks.push(
            {
                title: 'Flushing Magento caches',
                task: async (): Promise<void> => {
                    // Flush the magento caches and import config data
                    await localhostMagentoRootExec(`${config.settings.magerun2CommandLocal} cache:enable; ${config.settings.magerun2CommandLocal} cache:flush; ${config.settings.magerun2CommandLocal} app:config:import`, config);
                }
            }
        );
    }
}

export default MagentoConfigureTask
