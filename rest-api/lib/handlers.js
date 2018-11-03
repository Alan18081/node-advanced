const _data = require('./data');
const helpers = require('./helpers');
const config = require('../config');

// Define the handlers
const handlers = {
	index(data, callback) {
		if(data.method === 'get') {
			helpers.getTemplate('index', (err, str) => {
				if(!err && str) {
					callback(200, str, 'html');
				} else {
					callback(500, { error: 'Failed to get page' });
				}
			})
		}
	},
	ping(data, callback) {
		callback(406, { name: 'Sample handler' });
	},
	notFound(data, callback) {
		callback(404);
	},
	users(data, callback) {
		const acceptableMethods = ['post', 'get', 'put', 'delete'];

		if(acceptableMethods.join(' ').indexOf(data.method) > -1) {
			handlers._users[data.method](data, callback);
		}
	},
	tokens(data, callback) {
		const acceptableMethods = ['post', 'get', 'put', 'delete'];

		if(acceptableMethods.join(' ').indexOf(data.method) > -1) {
			handlers._users[data.method](data, callback);
		} else {
			callback(405);
		}
	},
	checks(data, callback) {
		const acceptableMethods = ['post', 'get', 'put', 'delete'];

		if(acceptableMethods.join(' ').indexOf(data.method) > -1) {
			handlers._checks[data.method](data, callback);
		} else {
			callback(405);
		}
	},
	// Required data: firstName, lastName, phone, password, tosAgreement
	_users: {
		get(data, callback) {
			const phone = typeof data.query.phone === 'string'
				&& data.query.phone.length === 10 ? data.query.phone : false;

			if(phone) {
				const token = typeof data.headers.token === 'string' ? data.headers.token : false;
				handlers._tokens.verifyToken(token, phone, tokenValid => {
					if(tokenValid) {
						_data.read('users', phone, (err, data) => {
							if(!err && data) {
								delete data.hashedPassword;
								callback(200, data);
							} else {
								callback(404);
							}
						});
					} else {
						callback(403, { error: 'Missing required token in header' });
					}
				});
			}
		},
		post({ payload }, callback) {
			const firstName = typeof payload.firstName === 'string'
				&& payload.firstName.trim().length > 0
					? payload.firstName.trim() : false;

			const lastName = typeof payload.lastName === 'string'
				&& payload.lastName.trim().length > 0
					? payload.lastName.trim() : false;

			const phone = typeof payload.phone === 'string'
				&& payload.phone.trim().length === 10
					? payload.phone.trim() : false;

			const password = typeof payload.password === 'string'
			&& payload.password.trim().length > 0
				? payload.password.trim() : false;

			const tosAgreement = typeof payload.tosAgreement === 'boolean'
			&& payload.tosAgreement === true
				? payload.tosAgreement : false;


			if(firstName && lastName && phone && password && tosAgreement) {
				_data.read('users', phone, (err) => {
					if(err) {
						const hashedPassword = helpers.hash(password);

						if(hashedPassword) {
							const user = {
								firstName,
								lastName,
								phone,
								hashedPassword,
								tosAgreement
							};

							_data.create('users', phone, user, (err) => {
								if(err) {
									console.log(err);
									return callback(500, { error: 'Could not create user' });
								}
								callback(200);
							});
						} else {
							callback(500, { error: 'Could not hash user password' });
						}

					} else {
						callback(400, { error: 'User with this phone number already exists' });
					}
				})
			} else {
				callback(400, { error: 'Missing required fields' });
			}
		},
		put({ payload, headers }, callback) {
			const phone = typeof payload.phone === 'string'
				&& payload.phone.length === 10 ? payload.phone : false;

			if(phone) {
				const token = typeof headers.token === 'string' ? headers.token : false;
				handlers._tokens.verifyToken(token, phone, tokenValid => {
					if(tokenValid) {
						const firstName = typeof payload.firstName === 'string'
						&& payload.firstName.trim().length > 0
							? payload.firstName.trim() : false;

						const lastName = typeof payload.lastName === 'string'
						&& payload.lastName.trim().length > 0
							? payload.lastName.trim() : false;

						const password = typeof payload.password === 'string'
						&& payload.password.trim().length > 0
							? payload.password.trim() : false;

						if(firstName || lastName || password) {
							_data.read('users', phone, (err, userData) => {
								if(!err && userData) {
									if(firstName) {
										userData.firstName = firstName;
									}

									if(lastName) {
										userData.lastName = lastName;
									}

									if(password) {
										userData.hashedPassword = helpers.hash(password);
									}

									_data.update('users', phone, userData, (err) => {
										if(err) return callback(500, { error: 'Failed to update user' });
										callback(200, userData);
									});

								} else {
									callback(404, { error: 'User not found' });
								}
							})
						} else {
							callback(400, { error: 'Missing fields to update' });
						}
					} else {
						callback(403, { error: 'Invalid token' });
					}
				});

			} else {
				callback(400, { error: 'Missing required fields' });
			}

		},
		delete({ query }, callback) {
			const phone = typeof query.phone === 'string'
				&& query.phone.length === 10 ? query.phone : false;

			if(phone) {
				_data.read('users', phone, (err, data) => {
					if(!err && data) {
						_data.delete('users', phone, (err) => {
							if(!err) {
								const checks = typeof data.checks === 'object' && data.checks instanceof Array ? data.checks : [];
								const checksToDelete = checks.length;
								if(checksToDelete > 0) {
									let checksDeletingErrors = false;
									checks.forEach(id => {
										_data.delete('checks', id, (err) => {
											if(err) {
												checksDeletingErrors = true;
											}
										});
									});
									if(checksDeletingErrors) {
										callback(500, { error: 'Failed to delete all user checks properly' });
									} else {
										callback(200);
									}
								} else {
									callback(200);
								}
							} else {
								callback(500, { error: 'Failed to delete user' });
							}
						});
					} else {
						callback(400, { error: 'User not found' });
					}
				})
			} else {
				callback(400, { error: 'Phone number is invalid' });
			}
		}
	},
	_tokens: {
		get({ query }, callback) {
			const id = typeof query.id === 'string' && query.id.length === 10 ? query.id : false;
			if(id) {

				_data.read('tokens', id, (err, data) => {
					if(!err && data) {
						callback(200, data);
					} else {
						callback(500, { error: 'Failed to read data' });
					}
				});
			} else {
				callback(400, { error: 'Missing required field' });
			}

		},
		// Tokens - post
		// Required data: phone, password
		// Optional data: phone
		post({ payload }, callback) {
				const phone = typeof payload.phone === 'string'
				&& payload.phone.trim().length === 10
					? payload.phone.trim() : false;

				const password = typeof payload.password === 'string'
				&& payload.password.trim().length > 0
					? payload.password.trim() : false;

				if(phone && password) {
					_data.read('users', phone, (err, userData) => {
						if(!err && userData) {
							const hashedPassword = helpers.hash(userData);
							if(hashedPassword === userData.hashedPassword) {
								const token = helpers.createRandomString(10);
								const expires = Date.now() + 1000 * 60 * 60;
								const tokenObj = {
									phone,
									id: token,
									expires
								};

								_data.create('tokens', token, tokenObj, (err) => {
									if(!err) {
										callback(200, tokenObj);
									} else {
										callback(500, { error: 'Failed to create token' });
									}
								});
							} else {
								callback(400, { error: 'Invalid password' });
							}
						} else {
							callback(404, { error: 'User not found' });
						}
					});
				} else {
					callback(400, { error: 'Missing required fields' });
				}
			},
		put({ payload }, callback) {
			const id = typeof payload.id === 'string' && payload.id.trim().length === 10 ? payload.id : false;
			const extend = typeof payload.extend === 'boolean' && payload.extend === true ? payload.extend : false;
			if(id && extend) {
				_data.read('tokens', id, (err, tokenData) => {
					if(!err && tokenData) {
						if(tokenData.expires > Date.now()) {
							tokenData.expires = Date.now() + 1000 * 60 * 60;
							_data.update('tokens', id, tokenData, (err) => {
								if(!err) {
									callback(200);
								} else {
									callback(500, { error: 'Could not update the token\'s expiration' });
								}
							});
						} else {
							callback(400, { error: 'Toke has been expired and cannot be updated' });
						}
					} else {
						callback(404, { error: 'Token not found' });
					}
				});
			} else {
				callback(400, { error: 'Missing required field' });
			}
 		},
		delete({ payload }, callback) {
			const id = typeof payload.id === 'string' && payload.id.trim().length === 10 ? payload.id : false;
			if(id) {
				_data.read('tokens', id, (err, data) => {
					if(!err && data) {
						_data.delete('tokens', id, (err) => {
							if(!err) {
								callback(200);
							} else {
								callback(500, { error: 'Failed to delete token' });
							}
						})
					} else {
						callback(404, { error: 'Token not found' });
					}
				});
			} else {
				callback(400, { error: 'Missing required field' });
			}
		},

		verifyToken(id, phone, callback) {
			_data.read('tokens', id, (err, tokenData) => {
				if(!err && tokenData) {
					if(tokenData.phone === phone && tokenData.expires > Date.now()) {
						callback(true);
					} else {
						callback(false);
					}
				} else {
					callback(404, { error: 'Token not found' });
				}
			});
		}
	},
	_checks: {
		post({ payload, headers }, callback) {
			const protocol = typeof payload.protocol === 'string' && ['http', 'https'].indexOf(payload.protocol) ? payload.protocol : false;
			const url = typeof payload.url === 'string' && payload.url.trim().length > 0 ? payload.url.trim() : false;
			const method = typeof payload.method === 'string' &&  ['get', 'post', 'put', 'delete'].indexOf(payload.method.trim()) ? payload.protocol : false;
			const successCodes = payload.successCodes instanceof Array && payload.successCodes.length > 0 ? payload.successCodes : false;
			const timeoutSeconds = typeof payload.timeoutSeconds === 'number' && payload.timeoutSeconds >= 1 && payload.timeoutSeconds <= 5 ? payload.timeoutSeconds : false;

			if(protocol && method && url && successCodes && timeoutSeconds) {
				 const token = typeof headers.token === 'string' ? headers.token : false;

				 _data.read('tokens', token, (err, tokenData) => {
				 	  if(!err && tokenData) {
	 	          _data.read('users', tokenData.phone, (err, userData) => {
	 	          	 if(!err && userData) {
			            const userChecks = userData.checks instanceof Array ? userData.checks : false;
			            if(userChecks.length < config.maxChecks) {
				            const checkId = helpers.createRandomString(10);

				            const checkObject = {
				            	id: checkId,
					            userPhone: tokenData.phone,
					            protocol,
					            url,
					            method,
					            successCodes,
					            timeoutSeconds
				            };

				            _data.create('checks', checkId, checkObject, (err) => {
				            	if(!err) {
				            		userData.checks = userChecks;
				            		userData.checks.push(checkId);
					              _data.update('users', userData.phone, userData, (err) => {
					              	 if(!err) {
					              	 	callback(200, checkObject);
						               } else {
					              	 	callback(500, { error: 'Failed to update user\'s checks' });
						               }
					              });   	
					            } else {
				            		callback(500, { error: 'Failed to add check' });
					            }
				            })
			            } else {
			            	callback(400, { error: `User has max quantity of checks (${config.maxChecks})` });
			            }
		             } else {
	 	          	  callback(403);
		             }
	            });
				    } else {
				 	  	callback(403);
				    }
				 });
			} else {
				callback(400, { error: 'Missing required inputs or inputs are invalid' });
			}
		},
		get({ headers, query }, callback) {
			const id = typeof query.id === 'string' ? query.id : false;

			if(id) {
				_data.read('checks', id, (err, checkData) => {
					if(!err && checkData) {
						const token = typeof headers.token === 'string' ? headers.token : false;
						handlers._tokens.verifyToken(token, checkData.userPhone, tokenValid => {
							if(tokenValid) {
								callback(200, checkData);
							} else {
								callback(403, { error: 'Missing required token in header' });
							}
						});
					} else {

					}
				});
			}
		},
		put({ payload, headers }, callback) {
			const checkId = typeof payload.id === 'string' && payload.id.length > 0 ? payload.id : false;

			if(checkId) {
				_data.read('checks', checkId, (err, checkData) => {
				  if(!err && checkData) {
					  const token = typeof headers.token === 'string' ? headers.token : false;
					  handlers._tokens.verifyToken(token, checkData.userPhone, tokenValid => {
						  if(tokenValid) {
							  const protocol = typeof payload.protocol === 'string' && ['http', 'https'].indexOf(payload.protocol) ? payload.protocol : false;
							  const url = typeof payload.url === 'string' && payload.url.trim().length > 0 ? payload.url.trim() : false;
							  const method = typeof payload.method === 'string' &&  ['get', 'post', 'put', 'delete'].indexOf(payload.method.trim()) ? payload.protocol : false;
							  const successCodes = payload.successCodes instanceof Array && payload.successCodes.length > 0 ? payload.successCodes : false;
							  const timeoutSeconds = typeof payload.timeoutSeconds === 'number' && payload.timeoutSeconds >= 1 && payload.timeoutSeconds <= 5 ? payload.timeoutSeconds : false;

							  if(protocol || url || method || successCodes || timeoutSeconds) {
								  if (protocol) {
									  checkData.protocol = protocol;
								  }

								  if (url) {
									  checkData.url = url;
								  }

								  if (method) {
									  checkData.method = method;
								  }

								  if (successCodes) {
									  checkData.successCodes = successCodes;
								  }

								  if (timeoutSeconds) {
									  checkData.timeoutSeconds = timeoutSeconds;
								  }

								  _data.update('checks', checkId, checkData, (err) => {
									  if (!err) {
										  callback(200, checkData);
									  } else {
										  callback(500, {error: 'Failed to update check'});
									  }
								  });
							  };
						  } else {
							  callback(400, { error: 'Nothing to update' });
						  }
					  });
					} else {
						callback(404, { error: 'Check not found' });
					}
				});

			} else {
				callback(400, { error: 'Missed required field' });
			}
		},
		delete({ query, headers }, callback) {
			const id = typeof query.id === 'string' ? query.id : false;

			if(id) {
				_data.read('checks', id, (err, checkData) => {
					if(!err && checkData) {
						const token = typeof headers.token === 'string' ? headers.token : false;
						handlers._tokens.verifyToken(token, checkData, tokenIsValid => {
							if(tokenIsValid) {
								_data.delete('checks', (err) => {
									if(!err) {
										_data.read('users', checkData.userPhone, (err, userData) => {
											if(!err) {
												const checkPosition = userData.checks.indexOf(id);
												if(checkPosition > -1) {
													userData.checks.splice(checkPosition, 1);
													_data.update('users', checkData.userPhone, userData, (err) => {
														if (!err) {
															callback(200);
														} else {
															callback(500, { error: 'Failed to update user' });
														}
													});
												} else {
													callback(500, { error: 'Check is not found in user object'});
												}
											} else {
												callback(500, { error: 'Failed to delete user' });
											}
										});
									} else {
										callback(500, { error: 'Failed to delete check' })
									}
								});

							} else {
								callback(403);
							}
						});

					} else {
						callback(400, { error: 'User not found' });
					}
				})
			} else {
				callback(400, { error: 'Phone number is invalid' });
			}
		}
	}
};

module.exports = handlers;