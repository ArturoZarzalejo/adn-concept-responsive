var newPromise = (function() {
	var fn = {
		resolveSuccess: function(){
			if(this.successFn){
				this.successFn(arguments[0]);
			}else{
				this.successArguments = arguments[0];
			}
		},
		resolveError: function(){
			if(this.errorFn)
				this.errorFn(arguments[0]);
		},
		then: function(){
			this.successFn = (arguments[0] || false);
			this.errorFn = (arguments[1] || false);

			if(this.successArguments){
				var self = this;
				setTimeout( function() {
					self.successFn(self.successArguments);
				},0);
			}
		}
	};
	var Promise = function(){
		for(i in fn){
			this[i] = fn[i].bind(this);
		}
	};
	return Promise;		
})();


var Components = (function(){

	var api = arguments[0] || "../../api/components.php";

	outdated = {};
	liveUpdate = true;
	list = {};

	var fn = {
		/*
		* @param url => String
		* @param callback => function(data)
		*/
		jsonp: function(){
			var q = new newPromise;
			var req = new XMLHttpRequest();

			req.open("POST", arguments[0], true);
			req.send(JSON.stringify(arguments[1]) || 0); 

			req.onload = function(){
				if(req.status >= 200 && req.status < 400){
					q.resolveSuccess(JSON.parse(req.response));	
				}else{
					q.resolveError({
						status: req.status,
						statusText: req.statusText,
						responseURL: req.responseURL
					});	
				}
			};	

			return q;	
		},
		search: function(){
			return this.jsonp(api, {
				search: this._searchStringToObj(arguments[0] || ''),
				limit: arguments[1] === undefined ? 20 : arguments[1],
				offset: arguments[2] === undefined ? 0 : arguments[2]
			});
		},
		/*
		* @param {(String|Array<string>)} comp_id
		*		Components requested
		* @param {(Array<string>)=} fields 
		*   Fields from the database requested
		* @param {(boolean)=} children 
		*   It ensures that the children elements of the container are
		*		downloaded.
		*
		* @return {HttpPromise} Returns a Promise that will be resolved to a response 
		*	array of components when the request succeeds or fails
		*/
		get: function(){
			if(arguments[2]){
				return this.getContainerData(arguments[0], arguments[1] || false);
			}
			arguments[1] = arguments[1] ? arguments[1] : [];

			var args = arguments;
			var q = new newPromise();
			var select = [];
			var returnList = [];
			var comp_ids = (arguments[0] && arguments[0].constructor === Array) ? arguments[0] : [ arguments[0] ];
			var aux_comp_ids = comp_ids;

			Array.prototype.forEach.call(aux_comp_ids, function(){
				var comp_id = arguments[0];
				if(list[comp_id] !== undefined){
					var needRequest = false;
					Array.prototype.forEach.call(args[1].filter(function(obj){
					    return !(obj in select);
					}), function(){
						if(list[comp_id][ arguments[0] ] === undefined || (outdated[comp_id] !== undefined && outdated[comp_id].indexOf(arguments[0]) !== -1) ){
							list[comp_id][ arguments[0] ] = false;
							select.push(arguments[0]);
							needRequest = true;
							if(outdated[comp_id] !== undefined && outdated[comp_id].indexOf(arguments[0]) !== -1){
								outdated[comp_id].splice(outdated[comp_id].indexOf(arguments[0]), 1);
							}
						}
					});
					if(!needRequest){
						comp_ids.splice(comp_ids.indexOf(arguments[0]), 1);
						returnList.push( this._selectComponentFields(comp_id, args[1]) );
					}
				}else{
					select = args[1];
					list[comp_id] = {};
					Array.prototype.forEach.call(select, function(){
						list[comp_id][arguments[0]] = false;
					});
				}
			}.bind(this));

			if(!comp_ids.length){
				q.resolveSuccess(returnList);
			}else{
				this.jsonp(api, {
					getComponents: comp_ids,
					select: select
				}).then(function() {
					Array.prototype.forEach.call(arguments[0], function(){
						this._mergeData(arguments[0]);
						returnList.push( this._selectComponentFields(arguments[0].comp_id, args[1]) );
					}.bind(this));
					q.resolveSuccess( returnList );		
				}.bind(this), function() {
					q.resolveError(arguments[0]);		
				});
			}

			return q;
		},
		set: function(){
			var q = new newPromise();
			var setList = (arguments[0] && arguments[0].constructor === Array) ? arguments[0] : [ arguments[0] ];

			this.jsonp(api, {
				setComponents: setList
			}).then(function() {
				Array.prototype.forEach.call(arguments[0], function(){
					this._mergeData(arguments[0]);
				}.bind(this));

				q.resolveSuccess( arguments[0] );		
			}, function() {
				q.resolveError(arguments[0]);		
			});

			return q;
		},
		outdated: function(){
			var q = new newPromise();

			var comp_ids = arguments[0].constructor === Array ? arguments[0] : [ arguments[0] ];
			var select = [];

			Array.prototype.forEach.call(comp_ids, function(){
				var comp_id = arguments[0];
				if(list[comp_id] !== undefined ){
					Array.prototype.forEach.call(list[ comp_id ], function(){
						if(liveUpdate && arguments[1] !== 'comp_id' && select.indexOf(arguments[1]) === -1){
							select.push(arguments[1]);
						}else if(outdated[comp_id] === undefined){
							outdated[comp_id] = [arguments[1]];
						}else if(outdated[comp_id].indexOf(arguments[1]) === -1){
							outdated[comp_id].push(arguments[1]);
						}
					});
					if(liveUpdate){
						this.jsonp(api, {
							getComponents:{
								comp_ids: comp_ids,
								select: select
							}
						}).then(function() {
							Array.prototype.forEach.call(arguments[0], function(){
								this._mergeData(arguments[0]);
							}.bind(this));
							q.resolveSuccess( arguments[0] );		
						}, function() {
							console.log('liveUpdate');
							q.resolveError( arguments[0] );		
						});
					}
				}
			});

			return q;
		},

		getContainerData: function(){
			var q = new newPromise();

			var comp_ids = arguments[0].constructor === Array ? arguments[0] : [ arguments[0] ];
			var select = arguments[1] ? arguments[1] : [];

			this.get(comp_ids, select.indexOf('container') === -1 ? select.concat(['container']) : select ).then(function(){
				var getArgs = arguments;
				var containerComponents = [];
				Array.prototype.forEach.call(arguments[0], function(){
					this._merge(containerComponents, this._containerToArray(arguments[0].container) );	
				}.bind(this));

				this.get(containerComponents, select).then(function(){
					q.resolveSuccess(getArgs[0]);
				});
			}.bind(this));			

			return q;
		},

		_containerToArray: function(){
			var result = [];
			for(var key in arguments[0]){
				if('comp_id' in arguments[0][key]){
					result.push(arguments[0][key].comp_id);
				}
				if('container' in arguments[0][key]){
					result = result.concat(this._containerToArray(arguments[0][key].container));
				}
			}
			return result;
		},


		_mergeData: function(){
			if(arguments[0]['comp_id']){
				if(list[arguments[0]['comp_id']] === undefined){
					list[arguments[0]['comp_id']] = arguments[0];
				}else{
					this._merge(list[arguments[0]['comp_id']],arguments[0]);

				}
			}
		},

		/*
		 * @param String => comp_id
		 * @param Array => list of fields requested
		 * @return Object => the Components fields requested only
		 */
		_selectComponentFields: function(){
			if(arguments[1].length === 0){
				return list[arguments[0]];
			}
			var args = arguments;
			var tmp = {comp_id: args[0]};
			Array.prototype.forEach.call(args[1], function(){
				tmp[ arguments[0] ] = list[ args[0] ][ arguments[0] ];
			});
			return tmp;
		},

		_merge: function(){
			for(var key in arguments[0]){
				for(var keyMerge in arguments[1]){
					arguments[0][keyMerge] = arguments[1][keyMerge];
				}
			}
			return arguments[0];
		},

		_searchStringToObj: function(){
			output = {};
			input = arguments[0];

	    if(input === undefined){
	      return {other: ''};
	    }

	    parameters = input.match(/(\w+\:+\()|(\w+\:)/g);
	    while(parameters !== null){

	      if(parameters[0].indexOf('(') === -1){
	        var param_name = parameters[0].slice(0, parameters[0].length-1);

	        var regex = new RegExp(parameters[0]+"([^\\s]+)", "g");
	        var regex_result = input.match(regex);
	        if(regex_result !== null)
	          output[param_name] = regex_result[0].replace(parameters[0], '');
	      }else{
	        var param_name = parameters[0].slice(0, parameters[0].length-2);
	        var regex = new RegExp(param_name+"\\:\\((.*?)\\)|"+ param_name + "\\:\\((.*?)$" , "g");
	        var regex_result = input.match(regex);
	        if(regex_result !== null)
	          output[param_name] = regex_result[0].slice(0, regex_result[0].length-1).replace(parameters[0], '');
	      }

	      if(regex_result !== null){
	        input = input.replace(regex_result, '');
	      }
	      else{
	        input = input.replace(parameters[0], '');
	      }

	      parameters = input.match(/(\w+\:+\()|(\w+\:)/g);
	    }

	    output["other"] = input.trim();
	    

	    return output;
		}
		

	};

	var Components = function(){
		
		for(i in fn){
			this[i] = fn[i];
		}

	};

	return Components;
	
	
})();



