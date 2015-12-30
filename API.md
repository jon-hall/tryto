<a name="module_tryto"></a>
## tryto ⇒ <code>module:tryto~Tryto</code>
The default export for the library is a factory function which wraps the Tryto constructor.

**Returns**: <code>module:tryto~Tryto</code> - A 'Tryto' instance which can be configured to run the suppliedfunction until it succeeds (or any configured limits are hit).  

| Param | Type | Description |
| --- | --- | --- |
| fn | <code>function</code> | The function which is to be (re)tried. |


* [tryto](#module_tryto) ⇒ <code>module:tryto~Tryto</code>
    * [.Tryto](#module_tryto.Tryto)
        * [new Tryto(fn)](#new_module_tryto.Tryto_new)
        * [.for(times)](#module_tryto.Tryto+for) ⇒ <code>module:tryto~Tryto</code>
        * [.every(delay)](#module_tryto.Tryto+every) ⇒ <code>module:tryto~Tryto</code>
        * [.using(strategy)](#module_tryto.Tryto+using) ⇒ <code>module:tryto~Tryto</code>
        * [.config(config)](#module_tryto.Tryto+config) ⇒ <code>module:tryto~Tryto</code>
        * [.now()](#module_tryto.Tryto+now) ⇒ <code>Promise</code>
        * [.in(delay)](#module_tryto.Tryto+in) ⇒ <code>Promise</code>
    * [.nobackoff](#module_tryto.nobackoff) : <code>function</code>
    * [.linear](#module_tryto.linear) : <code>function</code>
    * [.exponential](#module_tryto.exponential) : <code>function</code>
    * [.fibonacci](#module_tryto.fibonacci) : <code>function</code>

<a name="module_tryto.Tryto"></a>
### tryto.Tryto
The main 'tryto' class, which is created with a function to (re)try,it can then be configured via a series of chainable method calls, and finallystarted - which returns a promise.

**Kind**: static class of <code>[tryto](#module_tryto)</code>  

* [.Tryto](#module_tryto.Tryto)
    * [new Tryto(fn)](#new_module_tryto.Tryto_new)
    * [.for(times)](#module_tryto.Tryto+for) ⇒ <code>module:tryto~Tryto</code>
    * [.every(delay)](#module_tryto.Tryto+every) ⇒ <code>module:tryto~Tryto</code>
    * [.using(strategy)](#module_tryto.Tryto+using) ⇒ <code>module:tryto~Tryto</code>
    * [.config(config)](#module_tryto.Tryto+config) ⇒ <code>module:tryto~Tryto</code>
    * [.now()](#module_tryto.Tryto+now) ⇒ <code>Promise</code>
    * [.in(delay)](#module_tryto.Tryto+in) ⇒ <code>Promise</code>

<a name="new_module_tryto.Tryto_new"></a>
#### new Tryto(fn)
Makes a new Tryto instance.


| Param | Type | Description |
| --- | --- | --- |
| fn | <code>function</code> | The function this Tryto will be trying to run. |

<a name="module_tryto.Tryto+for"></a>
#### tryto.for(times) ⇒ <code>module:tryto~Tryto</code>
Specify how many times the function should be tried before rejecting.

**Kind**: instance method of <code>[Tryto](#module_tryto.Tryto)</code>  
**Returns**: <code>module:tryto~Tryto</code> - This instance, for chaining.  

| Param | Type | Description |
| --- | --- | --- |
| times | <code>Number</code> | The number of times to retry the function associated with this Tryto before giving up. |

<a name="module_tryto.Tryto+every"></a>
#### tryto.every(delay) ⇒ <code>module:tryto~Tryto</code>
Specify how frequently the function should be tried (initially, at least).

**Kind**: instance method of <code>[Tryto](#module_tryto.Tryto)</code>  
**Returns**: <code>module:tryto~Tryto</code> - This instance, for chaining.  

| Param | Type | Description |
| --- | --- | --- |
| delay | <code>Number</code> | The initial delay (in milliseconds) at which to retry the function, should it fail. |

<a name="module_tryto.Tryto+using"></a>
#### tryto.using(strategy) ⇒ <code>module:tryto~Tryto</code>
Choose the strategy which will be used for calculating the next delay (backoff).

**Kind**: instance method of <code>[Tryto](#module_tryto.Tryto)</code>  
**Returns**: <code>module:tryto~Tryto</code> - This instance, for chaining.  

| Param | Type | Description |
| --- | --- | --- |
| strategy | <code>function</code> | Either a 'nextable' - a function which can be repeatedly called to get the next delay - or a 'nextable' factory, which can be called with a config object and returns a 'nextable' as a result. |

<a name="module_tryto.Tryto+config"></a>
#### tryto.config(config) ⇒ <code>module:tryto~Tryto</code>
Set any configuration for the strategy which is active when the retries are started.

**Kind**: instance method of <code>[Tryto](#module_tryto.Tryto)</code>  
**Returns**: <code>module:tryto~Tryto</code> - This instance, for chaining.  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>Object</code> | A configuration object which will be passed to the 'nextable' factory function of the active strategy when 'in' or 'now' is called. |

<a name="module_tryto.Tryto+now"></a>
#### tryto.now() ⇒ <code>Promise</code>
Start attempting to run the function immediately (well, on the next tick...).

**Kind**: instance method of <code>[Tryto](#module_tryto.Tryto)</code>  
**Returns**: <code>Promise</code> - A promise which resolves with the result of the function,if it succeeds, or rejects should the function fail to execute successfully beforethe configured limits are hit.  
<a name="module_tryto.Tryto+in"></a>
#### tryto.in(delay) ⇒ <code>Promise</code>
Start attempting to run the function after the scheduled amount of time.

**Kind**: instance method of <code>[Tryto](#module_tryto.Tryto)</code>  
**Returns**: <code>Promise</code> - A promise which resolves with the result of the function,if it succeeds, or rejects should the function fail to execute successfully beforethe configured limits are reached.  

| Param | Type | Description |
| --- | --- | --- |
| delay | <code>Number</code> | The delay (in milliseconds) after which to start trying the function. |

<a name="module_tryto.nobackoff"></a>
### tryto.nobackoff : <code>function</code>
A strategy which never increases the retry delay.

**Kind**: static property of <code>[tryto](#module_tryto)</code>  
<a name="module_tryto.linear"></a>
### tryto.linear : <code>function</code>
A strategy which increases the retry delay linearly.

**Kind**: static property of <code>[tryto](#module_tryto)</code>  
<a name="module_tryto.exponential"></a>
### tryto.exponential : <code>function</code>
A strategy which increases the retry delay exponentially.

**Kind**: static property of <code>[tryto](#module_tryto)</code>  
<a name="module_tryto.fibonacci"></a>
### tryto.fibonacci : <code>function</code>
A strategy which increases the retry delay based on the fibonacci sequence.

**Kind**: static property of <code>[tryto](#module_tryto)</code>  
