/**
* 支持hash类型的urls 
* 提供易用的api
* 不自动运行
* 在需要的时候监听变化
*/
var Route = {
	'routes' :[], //保存当前已经注册的路由
	'mode': null, //‘hash’或者'history'(是否运用History API)
	'root': '/',  //应用的根目录，只在用pushState的情况下需要
	'config': function(options){
		//如果模式是history，则必须支持 history.pushState方法
		this.mode = options && options.mode && options.mode =='history' && !!(history.pushState) ? 'history' : 'hash';
		this.root = options && options.root ? '/' + this.clearSlashes(options.root) + '/' : '/';	
		return this;	
	},
	/*
	*用于去除 开始与结束的斜杠
	*/
	'clearSlashes': function(path){
		return path.toString()().replace(/\/$/,'').replace(/^\//,'');
	},
	/**
	*获取当前url
	*/
	'getFragment':function(){
		var fragment = '';
		//如果是history模式,需要删除url的根部
		if(this.mode === 'history'){
			fragment = this.clearSlashes( decodeURL( location.pathname +  location.search ));
			fragment = fragment.replace(/\?(.*)$/ , '');
			fragment = this.root != '/' ?  fragment.replace(this.root,'') : fragment;
		}
		//如果是hash模式
		else{
			var match = window.location.href.match(/#(.*)$/);
			fragment = match ? match[1] : '';
		}
		return this.clearSlashes(fragment);
	},
	/**
	* 添加路由
	* 如果只传入一个函数，则被认为是默认路由
	*/
	'add': function(re,handler){
		if(typeof re == 'function'){
			handler = re;
			re ='';
		}
		this.routes.push({
			're':re,
			'handler':handler
		});
		//返回this 是为了更好地进行链式操作
		return this;
	},
	/**
	* 删除路由
	*
	*/
	'remove': function(param){
		for(var i =0 ;i<this.routes.length;i++){
			var r = this.routes[i];
			if(r.handler == param || r.toString() ==  param.toString()){
				this.routes.splice(i,1);
				return this;
			}		
		}
		return this;
	},
	/**
	*初始化类
	*/
	'flush':function(){
		this.routes = [];
		this.mode = null;
		this.root = '/';
		return this;
	},
	/**
	* 根据url fragment进行回调
	*
	*/
	'check': function(f){
		var fragment = f || this.getFragment();
		for(var i = 0;i<this.routes.length;i++){
			var match = fragment.match(this.routes[i].re);
			if(match){
				match.shift();
				this.routes[i].handler.apply({},match);
				return this;
			}
		}
		return this;
	},
	/**
	*改变urls
	*/
	'change':function(path){
		path =path? this.clearSlashes(path): '';
		//如果是 history模式
		if(this.mode == 'history'){
			hitory.pushState(null,null,this.root + path);
		}
		//如果是 hash模式
		else{
			window.location.href.math(/#(.*)$/);
			window.location.href = window.location.href.replace(/#(.*)$/ , '' ) +'#' + path
		}
		return this;
	},
	/**
	*检测变化(非人工)
	* 
	*/
	'listen':function(){
		var that = this;
		var current = that.getFragment();
		var fn = function(){
			//当当前url发生变化时，则进行check方法，进行回调
			if( current != that.getFragment()){
				current  = that.getFragment();
				that.check(current);
			}
		}
		//先清空之前的监测
		clearInterval(this.interval);
		this.interval = setInterval(fn , 50);
		return this;
	}
}

Route.config({mode:'history'});
Route.change();
Route.add('/about/',function(){
	console.log('about');
}).add('/products\/(.*)\/edit\/(.*)/', function(){
	console.log('praducts',arguments);
}).check('/products/12/edit/22').listen();

//修改urls
Router.change('/about');