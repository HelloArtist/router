# 单页应用的路由组件设计

在单页应用中，路由可以说是最基础的部分了，合理的路由组件可以让单页应用的业务逻辑、开发效率得到提升。   
使用 angular、reat、vue，我们都习惯了使用它们的路由，而在一般的单页项目，其实我们可以自己实现一个路由组件的。   
下面我们来设计一个路由组件   

## 路由基础知识
单页应用会通过url后的井号 `#`来管理路由。   
在设计路由组件之前，我们先来了解一下基础的知识   

**什么是井号**   
井号代表网页的一个位置。在html中，通过描点与井号的结合，可以让网页的位置自动滚动到可视范围内。   

**HTTP请求不包括井号**   
在对服务器发起请求时，是不会带有井号后面的数据的。井号后面的任何字符，都被浏览器解析为位置标识符。   
这个需要特别注意，尤其在涉及页面在第三方转跳的情况。   

**改变井号不会导致网页重载**   

**改变井号会改变浏览器的访问历史**   
这个特性让我们可以在单页应用中实现后退等操作   

**window.location.hash可以读取井号后面的值**   
`window.location.hash`这个值可读可写。在设计路由组件时，读取该属性可以判断地址栏是否改变；写入时会创造一条访问历史。   

**onhashChange**   
html5的新特性，井号改变时会触发该事件。对于不支持这个属性的，可以通过 `setInterval`监控 `location.hash`的变化   

## history API基础知识
`window.history`表示window对象的历史记录，它提供对浏览器历史记录的访问能力。   

`window.history.back()`实现在浏览器中后退， `window.history.forward()`则是前进。    
通过 `window.history.go(index)`，可以从当前回话的历史记录中加载页面：0是当前页面，-1是上一页，1是下一页。  

**修改历史记录点**   
1.存储当前历史记录点。history的存储方式类似于数组的入栈(`array.push`)，在里面新增一个历史记录可以这样写：  

```
// 当前的url为：http://x.guanmac.com

var json={time:new Date().getTime()};

// @状态对象：记录历史记录点的额外对象，可以为空
// @页面标题：目前所有浏览器都不支持
// @可选的url：浏览器不会检查url是否存在，只改变url，url必须同域，不能跨域

window.history.pushState(json,"","http://x.guanmac.com/post-1.html");

```

2.替换当前历史记录点   

`window.history.replaceState`和 `window.history.pushState`类似，不同的是 `widow.history.replaceStaet`不会新增历史记录点。  

3.监听历史记录点   

监听url的hash部分，可以使用HTML5的新api:`onhashchange`。


## 动手
在动手之前，我们先来确定一下这个路由可以实现的功能：   

- 支持onhashChange和history模式的实现方式
- 不自动运行，直到初始化完成
- 路由变化时可回调
- 路由配置通过正则实现
- 方法可链式调用
- 支持amd/cmd/umd等规范

该组件对外提供三个接口：

-  `add(reg ,cb)`，添加路由，reg为正则表达式，cb为回调
-  `remove(cb)`，移除已添加的路由，cb为回调
-  `listen()`，开始监听路由变化
-  `change(str)`，改变路由，str为改变的地址

下面是它的使用例子

```
//引入
var route = require('route');
//添加路由
route.add('',function(){
	console.log('默认');
});

route.add(/^test$/ , function(){
	console.log('匹配 http://xxx.com/#test 路由');
});

route.add(/^text\/(.*)/ , function(){
	var index = arguments[0];
	console.log('传递的参数是',index);
});

//开始监听

route.listen();
//改变路由
route.change('text/1');

```

### 正式开工   
首先我们说一下它最基本的实现逻辑。   
组件内使用一个数组 `routes`保存自定义的路由配置，监听hash值的变化；hash变化时,循环`routes`，找出第一个匹配的键值，传入参数并执行回调。  

### 定义

```
class Route{

	constructor() {
	  this.routes = []; //保存已经注册的路由
	  this.mode  = 'hash' ;// 'hash'或history
	  this.root  ='/';//应用的根目录，只在用 pushState的情况下需要
	  return this;
	}
	/**
	 * 添加注册路由
	 * @param {[type]} reg    [路由，正则表达式]
	 * @param {[type]} handle [回调函数]
	 */
	add(reg ,handle){
		return this;
	}

	/**
	 * 根据回调函数删除已注册的路由
	 * @param  {[type]} handle [回调函数]
	 */
	remove(handle){
		return this;
	},

	/**
	 * 监听路由变化
	 */
	listen(){
		return this;
	}

	/**
	 * 改变路由
	 * @param  {[type]} path [路由路径]
	 */
	change(path){
		return this;
	}
}
 
```

### 添加注册路由
添加路由，即把正则表达式是键值，回调函数是值，组成对象放入数组 `this.routes`中。   
如果只传入一个回调函数，则被认为是默认路由。   
我们把需要注册的路由放在数组的尾部，形成队列。

```
add(reg ,handle){
		if(typeof reg == 'function'){
			handle = reg;
			reg = '';
		}

		this.routes.unshift({
			re : reg,
			handle:handle
		})
		return this;
	}

```
### 监听路由
监听路由有两种方式：一种是使用 `setInterval`定时监听，一种是监听 `hashchange` 事件。   
下面两种方式都提供，不过鉴于目前浏览器基本都支持 `hashchange`事件了，建议使用后者。   

**注意**  
如果只监听 `hashchang`事件，在页面载入访问的是如 `http://xxx.com/#test/1`这样的带有路由的地址，系统将不会触发该路由的回调，因为并没有触发 `hashchange`事件，所以我们得再监听一个事件，保证页面第一次加载时，路由能正常触发： `document.load`。

```
	listen(){
		var that = this;
		document.addEventListener('load',function(){
			that.check(that.getFragment());
		});

		document.addEventListener('hashchange',function(){
			that.check(that.getFragment());
		});
		// var current = that.getFragment();
			// var fn = function() {
			// 		//当当前url发生变化时，则进行check方法，进行回调
			// 		if (current!= that.getFragment()) {
			// 			current = that.getFragment();
			// 			that.check(current);
			// 		}
			// 	}
			// 	//先清空之前的监测
			// this.interval = setInterval(fn, 50);
		return this;
	}
	
```

### getFragment
我们先来看一下 `getFragment()`。这个方法是获取当前url——井号后面的值。   
  
**注意**   
当是history模式时，我们需要删除url的根部

```
	/**
	 *用于去除 开始与结束的斜杠
	 */
	'clearSlashes': function(path) {
		return path.toString().replace(/\/$/, '').replace(/^\//, '');
	}

	/**
	 * 获取当前url
	 * @return {[type]} [当前url]
	 */
	getFragment(){
		var that =this;
		var fragment = '';
			//如果是history模式,需要删除url的根部
			if (this.mode === 'history') {
				var path = decodeURI(location.pathname + location.search);
				fragment = this.clearSlashes(path);
				fragment = fragment.replace(/\?(.*)$/, '');
				fragment = this.root != '/' ? fragment.replace(this.root, '') : fragment;
			}
			//如果是hash模式
			else {
				var match = window.location.href.match(/#(.*)$/);
				fragment = match ? match[1] : '';
			}
		return this.clearSlashes(fragment);
	}

```

### check
check方法，是检测 `this.routes`是否存在匹配的路由，并调用回调方法

```
check(f){
		var that = this;
			var fragment = f || that.getFragment();
			for (var i = 0; i < that.routes.length; i++) {
				var match = fragment.match(that.routes[i].re);
				if (match) {
					match.shift();//抛出之后剩下的是参数
					that.routes[i].handler.apply({}, match);
					return that;
				}
			}
			return that;
	}
	
```

### 改变路由change
改变路由就是改变url。   
对于history模式，我们只需要pushState路由就可以了，  
对于hash模式，我们使用 `replace`替换url。   

```

	change(path){
		path = path ? this.clearSlashes(path) : '';
			//如果是 history模式
			if (this.mode == 'history') {
				history.pushState(null, null, this.root + path);
			}
			//如果是 hash模式
			else {
				window.location.href.match(/#(.*)$/);
				window.location.href = window.location.href.replace(/#(.*)$/, '') + '#' + path
			}
			return this;
	}

```
通过上面这几个重要的方法，我们基本实现了简单、适用的路由组件了。  

下面是完整的代码

```
class Route{

	constructor() {
	  this.routes = []; //保存已经注册的路由
	   this.mode  = 'hash' ;// 'hash'或history
	  this.root  ='/';//应用的根目录，只在用 pushState的情况下需要
	  return this;
	}
	
	config(options) {
			//如果模式是history，则必须支持 history.pushState方法
			this.mode = options && options.mode && options.mode == 'history' && !!(history.pushState) ? 'history' : 'hash';
			this.root = options && options.root ? '/' + this.clearSlashes(options.root) + '/' : '/';
			return this;
	}
	
	/**
	 * 添加注册路由
	 * @param {[type]} reg    [路由，正则表达式]
	 * @param {[type]} handle [回调函数]
	 */
	add(reg ,handle){
		if(typeof reg == 'function'){
			handle = reg;
			reg = '';
		}

		this.routes.unshift({
			re : reg,
			handle:handle
		})
		return this;
	}

	/**
	 * 根据回调函数或正则删除已注册的路由
	 * @param  {[type]} handle [回调函数]
	 */
	remove(handle){
		for (var i = 0; i < this.routes.length; i++) {
				var r = this.routes[i];
				if (r.handler == handle || r.toString() == handle.toString()) {
					this.routes.splice(i, 1);
					return this;
				}
			}
			return this;
	}
	/**
	 *用于去除 开始与结束的斜杠
	 */
	'clearSlashes': function(path) {
		return path.toString().replace(/\/$/, '').replace(/^\//, '');
	}

	/**
	 * 获取当前url
	 * @return {[type]} [当前url]
	 */
	getFragment(){
		var that =this;
		var fragment = '';
			//如果是history模式,需要删除url的根部
			if (this.mode === 'history') {
				var path = decodeURI(location.pathname + location.search);
				fragment = this.clearSlashes(path);
				fragment = fragment.replace(/\?(.*)$/, '');
				fragment = this.root != '/' ? fragment.replace(this.root, '') : fragment;
			}
			//如果是hash模式
			else {
				var match = window.location.href.match(/#(.*)$/);
				fragment = match ? match[1] : '';
			}
		return this.clearSlashes(fragment);
	}

	/**
	 * 根据url进行回调
	 * @param  {[type]} f [description]
	 * @return {[type]}   [description]
	 */
	check(f){
		var that = this;
			var fragment = f || that.getFragment();
			for (var i = 0; i < that.routes.length; i++) {
				var match = fragment.match(that.routes[i].re);
				if (match) {
					match.shift();//抛出之后剩下的是参数
					that.routes[i].handler.apply({}, match);
					return that;
				}
			}
			return that;
	}

	/**
	 * 监听路由变化
	 */
	listen(){
		var that = this;
		document.addEventListener('load',function(){
			that.check(that.getFragment());
		});

		document.addEventListener('hashchange',function(){
			that.check(that.getFragment());
		});
		// var current = that.getFragment();
			// var fn = function() {
			// 		//当当前url发生变化时，则进行check方法，进行回调
			// 		if (current!= that.getFragment()) {
			// 			current = that.getFragment();
			// 			that.check(current);
			// 		}
			// 	}
			// 	//先清空之前的监测
			// this.interval = setInterval(fn, 50);
		return this;
	}

	/**
	 * 改变路由
	 * @param  {[type]} path [路由路径]
	 */
	change(path){
		path = path ? this.clearSlashes(path) : '';
			//如果是 history模式
			if (this.mode == 'history') {
				history.pushState(null, null, this.root + path);
			}
			//如果是 hash模式
			else {
				window.location.href.match(/#(.*)$/);
				window.location.href = window.location.href.replace(/#(.*)$/, '') + '#' + path
			}
			return this;
	}

	flush(){
		this.routes=[];
		this.mode = 'hash';
		this.route = '/';
		return this;
	}
}
 
let route = new Route();

```

上面是ES6的实现方式，鉴于目前基本没有浏览器支持，这里给出ES5的实现代码,可以直接复制使用。 

```
define(function(require, exports, module) {
	/**
	 * 支持hash类型的urls
	 * 提供易用的api
	 * 不自动运行
	 * 在需要的时候监听变化
	 */
	var Route = {
		'routes': [], //保存当前已经注册的路由
		'mode': null, //‘hash’或者'history'(是否运用History API)
		'root': '/', //应用的根目录，只在用pushState的情况下需要
		'config': function(options) {
			//如果模式是history，则必须支持 history.pushState方法
			this.mode = options && options.mode && options.mode == 'history' && !!(history.pushState) ? 'history' : 'hash';
			this.root = options && options.root ? '/' + this.clearSlashes(options.root) + '/' : '/';
			return this;
		},
		/*
		 *用于去除 开始与结束的斜杠
		 */
		'clearSlashes': function(path) {
			return path.toString().replace(/\/$/, '').replace(/^\//, '');
		},
		/**
		 *获取当前url
		 */
		'getFragment': function() {
			var fragment = '';
			//如果是history模式,需要删除url的根部
			if (this.mode === 'history') {
				var path = decodeURI(location.pathname + location.search);
				fragment = this.clearSlashes(path);
				fragment = fragment.replace(/\?(.*)$/, '');
				fragment = this.root != '/' ? fragment.replace(this.root, '') : fragment;
			}
			//如果是hash模式
			else {
				var match = window.location.href.match(/#(.*)$/);
				fragment = match ? match[1] : '';
			}
			return this.clearSlashes(fragment);
		},
		/**
		 * 添加路由
		 * 如果只传入一个函数，则被认为是默认路由
		 */
		'add': function(re, handler) {
			if (typeof re == 'function') {
				handler = re;
				re = '';
			}
			//fixed TODO 这里把push改成 unshift。
			this.routes.unshift({
				're': re,
				'handler': handler
			});
			//返回this 是为了更好地进行链式操作
			return this;
		},
		/**
		 * 删除路由
		 *
		 */
		'remove': function(param) {
			for (var i = 0; i < this.routes.length; i++) {
				var r = this.routes[i];
				if (r.handler == param || r.toString() == param.toString()) {
					this.routes.splice(i, 1);
					return this;
				}
			}
			return this;
		},
		/**
		 *初始化类
		 */
		'flush': function() {
			this.routes = [];
			this.mode = null;
			this.root = '/';
			return this;
		},
		/**
		 * 根据url fragment进行回调
		 *
		 */
		'check': function(f) {
			var that = this;
			var fragment = f || that.getFragment();
			for (var i = 0; i < that.routes.length; i++) {
				var match = fragment.match(that.routes[i].re);
				if (match) {
					match.shift();//抛出之后剩下的是参数
					that.routes[i].handler.apply({}, match);
					return that;
				}
			}
			return that;
		},
		/**
		 *改变urls
		 */
		'change': function(path) {
			path = path ? this.clearSlashes(path) : '';
			//如果是 history模式
			if (this.mode == 'history') {
				history.pushState(null, null, this.root + path);
			}
			//如果是 hash模式
			else {
				window.location.href.match(/#(.*)$/);
				window.location.href = window.location.href.replace(/#(.*)$/, '') + '#' + path
			}
			return this;
		},
		/**
		 *检测变化
		 *
		 */
		'listen': function() {
			var that = this;
			//添加页面load的事件
			window.addEventListener('load', function(){
				that.check(that.getFragment());
			});
			window.addEventListener('hashchange', function(){
				that.check( that.getFragment());
			});

			// var current = that.getFragment();
			// var fn = function() {
			// 		//当当前url发生变化时，则进行check方法，进行回调
			// 		if (current!= that.getFragment()) {
			// 			current = that.getFragment();
			// 			that.check(current);
			// 		}
			// 	}
			// 	//先清空之前的监测
			// this.interval = setInterval(fn, 50);
			return this;
		}
	}
	module.exports = Route;
});

```
## 参考

[阮一峰，url的井号](http://www.ruanyifeng.com/blog/2011/03/url_hash.html)    
