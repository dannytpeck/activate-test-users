const fs = require('fs');
const csv_writer = require('csv-write-stream');
const moment = require('moment');
const webdriver = require('selenium-webdriver'),
	By = webdriver.By,
	until = webdriver.until;
const driver = new webdriver.Builder()
	.forBrowser('chrome')
	.build();

const data = require('./testusers.json');
const finalTestUsersFilename = 'testusers-' + data.employerName + '-final.json';

const loginPage = 'https://mywellmetrics.com/User/Signup.aspx?e=' + data.employerName;
const settingsPage = 'https://mywellmetrics.com/controlpanel/roleadmin/settings.aspx';
const logoutPage = 'https://mywellmetrics.com/logout.aspx';

let usernames = [];
let test_user_filename = '';
let test_user_file_uploaded = false;
let i = 0;

let userActivationValue;
let userActivationText;

fs.readFile('./logs/' + data.employerName.replace(' ', '_') + 'atu_log_' + moment().format('YYYYMMDD') + '.md', 'UTF8', (err, fd) => {
  if (err) {
    if (err.code === "ENOENT") {
    	console.error('Log file does not exist... creating log file');
		  if (!fs.existsSync('./logs/')) {
				fs.mkdirSync('./logs/');
				console.log('Created /logs directory');
		  } else {
			  console.log('Directory /logs exists');
		  }
	  	fs.writeFile('./logs/' + data.employerName.replace(' ', '_') + 'atu_log_' + moment().format('YYYYMMDD') + '.md', '# Automated Test User log for ' + data.employerName + ' ' + moment().format('YYYYMMDD'), function(err) {
			  if (err) {
				  console.log(err);
				  return;
			  }
		  	console.log('Log file created in /logs');
	  	});
      return;
    } else {
      throw err;
    }
  }
});

driver.get(settingsPage).then(function() {
	getting_started();
});

let getting_started = function() {
	let login_ready = new Promise(function(resolve, reject) {
		let login_available = driver.findElement(By.name('ctl00$content$SiteThemeContentFragmentPage1$fragment_3526$ctl01$ctl00$LoginForm1$ctl06$username'));
		if (login_available) {
			resolve('Login ready...');
		} else {
			let reason = new Error('Element not found on page, login unsuccessful');
			reject(reason);
		}
	});

	login_ready.then(function(fulfilled) {
		console.log(fulfilled);
		log_status('INFO', 'login', fulfilled);
		driver.findElement(By.name('ctl00$content$SiteThemeContentFragmentPage1$fragment_3526$ctl01$ctl00$LoginForm1$ctl06$username')).sendKeys(data.employerName);
		driver.findElement(By.name('ctl00$content$SiteThemeContentFragmentPage1$fragment_3526$ctl01$ctl00$LoginForm1$ctl06$password')).sendKeys(data.password);
		driver.findElement(By.name('ctl00$content$SiteThemeContentFragmentPage1$fragment_3526$ctl01$ctl00$LoginForm1$ctl06$loginButton')).click();
		driver.wait(until.elementLocated(By.css('#ctl00_OuterTaskRegion_TaskRegion_SettingTabs_TabSet')), 24000).then(function() {
			let point_msg = 'Successfully signed in';
			console.log(point_msg);
			log_status('INFO', 'admin_dash', point_msg);
			driver.findElement(By.linkText('User Accounts')).click();
			driver.findElement(By.css('#ctl00_OuterTaskRegion_TaskRegion_PA_SignUpOptions option[selected="selected"]'))
			.getAttribute('value').then(function(selected) {
				log_status('INFO', 'save_config', selected);

				// Store user activation value if it hasn't been stored yet
				if (!userActivationValue) {
					userActivationValue = selected;
				}

				saveData();
			});

			driver.findElement(By.css('#ctl00_OuterTaskRegion_TaskRegion_PA_SignUpOptions option[selected="selected"]')).getAttribute('innerText').then(function(selected) {
				log_status('INFO', 'save_config', selected);

				// Store user activation text if it hasn't been stored yet
				if (!userActivationText) {
					userActivationText = selected;
					data.userActivation = userActivationText;
				}

				saveData();

				if (test_user_filename != '' && fs.existsSync(__dirname + '/' + test_user_filename) && !test_user_file_uploaded) {
					driver.findElement(By.id('ctl00_OuterTaskRegion_TaskRegion_UserNameFile')).sendKeys(__dirname + '/' + test_user_filename);
					driver.findElement(By.id('ctl00_OuterTaskRegion_TaskRegion_UpdateUserAccountFeatureToggles')).click();
					driver.switchTo().alert().accept();
					log_status('INFO', 'upload_test_user_file', 'File uploaded!');
					test_user_file_uploaded = true;
					driver.get(logoutPage).then(function() {
						driver.get(settingsPage).then(function() {
							getting_started();
						});
					});
				} else if (test_user_filename != '' && fs.existsSync(__dirname + '/' + test_user_filename) && test_user_file_uploaded) {
					driver.executeScript('document.querySelector(\'#ctl00_OuterTaskRegion_TaskRegion_PA_SignUpOptions option[selected="selected"]\').removeAttribute(\'selected\');');
					driver.executeScript('document.querySelector(\'#ctl00_OuterTaskRegion_TaskRegion_PA_SignUpOptions option[value="' + userActivationValue + '"]\').setAttribute(\'selected\',\'selected\');');
					driver.findElement(By.id('ctl00_OuterTaskRegion_TaskRegion_PA_Save')).click().then(function() {
						driver.quit();
					});
				} else if (selected == 'Email, Employee ID and Date of Birth') {
					log_status('INFO', 'admin_settings', 'configuration did not change');
					driver.findElement(By.id('ctl00_OuterTaskRegion_TaskRegion_ToggleFeatureOnOrOff')).sendKeys('on');
					driver.findElement(By.id('ctl00_OuterTaskRegion_TaskRegion_PA_Save')).click().then(function() {
						driver.get(logoutPage).then(function() {
							driver.get(loginPage).then(function() {
								driver.wait(until.elementLocated(By.id('ctl00_ctl00_content_content_LastName')), 24000).then(function() {
									activate_user('ctl00_ctl00_content_content_LastName');
								});
							});
						});
					});
				} else {
					log_status('INFO', 'admin_settings', 'configuration required update');
					driver.executeScript('document.querySelector(\'#ctl00_OuterTaskRegion_TaskRegion_PA_SignUpOptions option[selected="selected"]\').removeAttribute(\'selected\');');
					driver.executeScript('document.querySelector(\'#ctl00_OuterTaskRegion_TaskRegion_PA_SignUpOptions option[value="5"]\').setAttribute(\'selected\',\'selected\');');
					driver.findElement(By.id('ctl00_OuterTaskRegion_TaskRegion_ToggleFeatureOnOrOff')).sendKeys('on');
					driver.findElement(By.id('ctl00_OuterTaskRegion_TaskRegion_PA_Save')).click().then(function() {
						driver.get(logoutPage).then(function() {
							driver.get(loginPage).then(function() {
								driver.wait(until.elementLocated(By.id('ctl00_ctl00_content_content_LastName')), 24000).then(function() {
									activate_user('ctl00_ctl00_content_content_LastName');
								});
							});
						});
					});
				}
			});
		}).catch(function(error) {
			console.log(error.message);
			log_status('ERROR!', 'admin_dash', error.message);
		});
	}).catch(function(error) {
		console.log(error.message);
		log_status('ERROR!', 'login', error.message);
	});
};

let activate_user = function(user_form) {
	log_status('INFO', 'user activation', 'beginning user activation');
	let activation_ready = new Promise(function(resolve, reject) {
		if (user_form) {
			resolve('Login ready...');
		} else {
			let reason = new Error('Element not found, login unsuccessful');
			reject(reason);
		}
	});

  activation_ready.then(function() {
		//saveData();
		driver.findElement(By.id('ctl00_ctl00_content_content_LastName')).sendKeys(data.users[i].lastName);
		driver.findElement(By.id('ctl00_ctl00_content_content_EmailAddress')).sendKeys(data.users[i].email);
		driver.findElement(By.id('ctl00_ctl00_content_content_EmployeeID')).sendKeys(data.users[i].employeeId);
		// Use 1/1/1970 as DOB for test users
		driver.findElement(By.id('ctl00_ctl00_content_content_txtMonth')).sendKeys('01');
		driver.findElement(By.id('ctl00_ctl00_content_content_txtDay')).sendKeys('01');
		driver.findElement(By.id('ctl00_ctl00_content_content_txtYear')).sendKeys('1970');
		usernames.push(data.users[i].username);

		driver.findElement(By.id('ctl00_ctl00_content_content_FindAccount')).click().then(function() {
			driver.findElement(By.id('ctl00_ctl00_content_content_ValidationLabel')).then(function() {
				console.log('User has not yet been added to ' + data.employerName + ' site');
				log_status('ERROR!', 'account_lookup', 'user not not yet added to site or already added');
				driver.quit();
			}).catch(function() {
				driver.wait(until.elementLocated(By.id('ctl00_ctl00_ctl00_content_content_CommonBodyColumnPlaceHolder_Username')), 24000).then(function() {

					driver.findElement(By.id('ctl00_ctl00_ctl00_content_content_CommonBodyColumnPlaceHolder_Username')).then(function() {
						driver.findElement(By.id('ctl00_ctl00_ctl00_content_content_CommonBodyColumnPlaceHolder_Username')).sendKeys(data.users[i].username);
						driver.findElement(By.id('ctl00_ctl00_ctl00_content_content_CommonBodyColumnPlaceHolder_Password')).sendKeys(data.users[i].password);
						driver.findElement(By.id('ctl00_ctl00_ctl00_content_content_CommonBodyColumnPlaceHolder_Password2')).sendKeys(data.users[i].password);
						driver.executeScript('document.getElementById(\'ctl00_ctl00_ctl00_content_content_CommonBodyColumnPlaceHolder_AcceptAgreement2\').click();').then(function() {
							driver.findElement(By.id('ctl00_ctl00_ctl00_content_content_CommonBodyColumnPlaceHolder_StartNow')).click().then(function() {
								driver.get(logoutPage).then(function() {
									if (data.users[i + 1]) {
										driver.get(loginPage).then(function() {
											driver.wait(until.elementLocated(By.id('ctl00_ctl00_content_content_LastName')), 24000).then(function() {
												i = i + 1;
												activate_user('ctl00_ctl00_content_content_LastName');
											});
										});
									} else {
										test_user_filename = data.employerName.replace(' ', '_').toLowerCase() + '_' + 'atu_lmupload.csv';
										fs.writeFile(test_user_filename, usernames.join('\n'), function(err) {
											if (err) {
												console.log(err);
												return;
											}
										});
										console.log('Test user csv created with name: ' + test_user_filename);
										driver.get(settingsPage).then(function() {
											getting_started();
										});
									}
								});
							});
						});
					}).catch(function(error) {
						console.log(error);
						log_status('ERROR!', 'account_lookup', error);
					});

				});
    	});
  	});
	}).catch(function(error) {
		console.log(error.message);
		log_status('ERROR!', 'user activation', error.message);
	});
};

function saveData() {
	fs.writeFile(finalTestUsersFilename, JSON.stringify(data, null, 4), function(err) {
		if (err) {
			console.log(err);
			return;
		}
		console.log('JSON updated');
	});
}

function log_status(grade, state, message) {
	fs.appendFile('./logs/' + data.employerName.replace(' ', '_') + 'atu_log_' + moment().format('YYYYMMDD') + '.md', '\n ## ' + grade + ': @ state ' + state + '\n\t' + message, function(err) {
		if(err) {
			return console.log(err);
		}
	});
}
