(()=>{var I=globalThis,O=I.ShadowRoot&&(I.ShadyCSS===void 0||I.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,R=Symbol(),X=new WeakMap,k=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==R)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o,e=this.t;if(O&&t===void 0){let s=e!==void 0&&e.length===1;s&&(t=X.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&X.set(e,t))}return t}toString(){return this.cssText}},Q=r=>new k(typeof r=="string"?r:r+"",void 0,R),M=(r,...t)=>{let e=r.length===1?r[0]:t.reduce((s,i,o)=>s+(n=>{if(n._$cssResult$===!0)return n.cssText;if(typeof n=="number")return n;throw Error("Value passed to 'css' function must be a 'css' function result: "+n+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+r[o+1],r[0]);return new k(e,r,R)},tt=(r,t)=>{if(O)r.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let e of t){let s=document.createElement("style"),i=I.litNonce;i!==void 0&&s.setAttribute("nonce",i),s.textContent=e.cssText,r.appendChild(s)}},H=O?r=>r:r=>r instanceof CSSStyleSheet?(t=>{let e="";for(let s of t.cssRules)e+=s.cssText;return Q(e)})(r):r;var{is:ft,defineProperty:_t,getOwnPropertyDescriptor:mt,getOwnPropertyNames:vt,getOwnPropertySymbols:yt,getPrototypeOf:$t}=Object,N=globalThis,et=N.trustedTypes,xt=et?et.emptyScript:"",wt=N.reactiveElementPolyfillSupport,E=(r,t)=>r,D={toAttribute(r,t){switch(t){case Boolean:r=r?xt:null;break;case Object:case Array:r=r==null?r:JSON.stringify(r)}return r},fromAttribute(r,t){let e=r;switch(t){case Boolean:e=r!==null;break;case Number:e=r===null?null:Number(r);break;case Object:case Array:try{e=JSON.parse(r)}catch{e=null}}return e}},it=(r,t)=>!ft(r,t),st={attribute:!0,type:String,converter:D,reflect:!1,useDefault:!1,hasChanged:it};Symbol.metadata??=Symbol("metadata"),N.litPropertyMetadata??=new WeakMap;var b=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=st){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){let s=Symbol(),i=this.getPropertyDescriptor(t,s,e);i!==void 0&&_t(this.prototype,t,i)}}static getPropertyDescriptor(t,e,s){let{get:i,set:o}=mt(this.prototype,t)??{get(){return this[e]},set(n){this[e]=n}};return{get:i,set(n){let c=i?.call(this);o?.call(this,n),this.requestUpdate(t,c,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??st}static _$Ei(){if(this.hasOwnProperty(E("elementProperties")))return;let t=$t(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(E("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(E("properties"))){let e=this.properties,s=[...vt(e),...yt(e)];for(let i of s)this.createProperty(i,e[i])}let t=this[Symbol.metadata];if(t!==null){let e=litPropertyMetadata.get(t);if(e!==void 0)for(let[s,i]of e)this.elementProperties.set(s,i)}this._$Eh=new Map;for(let[e,s]of this.elementProperties){let i=this._$Eu(e,s);i!==void 0&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){let e=[];if(Array.isArray(t)){let s=new Set(t.flat(1/0).reverse());for(let i of s)e.unshift(H(i))}else t!==void 0&&e.push(H(t));return e}static _$Eu(t,e){let s=e.attribute;return s===!1?void 0:typeof s=="string"?s:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){let t=new Map,e=this.constructor.elementProperties;for(let s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){let t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return tt(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){let s=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,s);if(i!==void 0&&s.reflect===!0){let o=(s.converter?.toAttribute!==void 0?s.converter:D).toAttribute(e,s.type);this._$Em=t,o==null?this.removeAttribute(i):this.setAttribute(i,o),this._$Em=null}}_$AK(t,e){let s=this.constructor,i=s._$Eh.get(t);if(i!==void 0&&this._$Em!==i){let o=s.getPropertyOptions(i),n=typeof o.converter=="function"?{fromAttribute:o.converter}:o.converter?.fromAttribute!==void 0?o.converter:D;this._$Em=i;let c=n.fromAttribute(e,o.type);this[i]=c??this._$Ej?.get(i)??c,this._$Em=null}}requestUpdate(t,e,s,i=!1,o){if(t!==void 0){let n=this.constructor;if(i===!1&&(o=this[t]),s??=n.getPropertyOptions(t),!((s.hasChanged??it)(o,e)||s.useDefault&&s.reflect&&o===this._$Ej?.get(t)&&!this.hasAttribute(n._$Eu(t,s))))return;this.C(t,e,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:i,wrapped:o},n){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,n??e??this[t]),o!==!0||n!==void 0)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),i===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[i,o]of this._$Ep)this[i]=o;this._$Ep=void 0}let s=this.constructor.elementProperties;if(s.size>0)for(let[i,o]of s){let{wrapped:n}=o,c=this[i];n!==!0||this._$AL.has(i)||c===void 0||this.C(i,void 0,o,c)}}let t=!1,e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(s=>s.hostUpdate?.()),this.update(e)):this._$EM()}catch(s){throw t=!1,this._$EM(),s}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(t){}firstUpdated(t){}};b.elementStyles=[],b.shadowRootOptions={mode:"open"},b[E("elementProperties")]=new Map,b[E("finalized")]=new Map,wt?.({ReactiveElement:b}),(N.reactiveElementVersions??=[]).push("2.1.2");var V=globalThis,rt=r=>r,j=V.trustedTypes,ot=j?j.createPolicy("lit-html",{createHTML:r=>r}):void 0,lt="$lit$",_=`lit$${Math.random().toFixed(9).slice(2)}$`,ht="?"+_,At=`<${ht}>`,$=document,z=()=>$.createComment(""),P=r=>r===null||typeof r!="object"&&typeof r!="function",Y=Array.isArray,kt=r=>Y(r)||typeof r?.[Symbol.iterator]=="function",L=`[ 	
\f\r]`,S=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,at=/-->/g,nt=/>/g,v=RegExp(`>|${L}(?:([^\\s"'>=/]+)(${L}*=${L}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),ct=/'/g,dt=/"/g,ut=/^(?:script|style|textarea|title)$/i,G=r=>(t,...e)=>({_$litType$:r,strings:t,values:e}),d=G(1),It=G(2),Ot=G(3),x=Symbol.for("lit-noChange"),u=Symbol.for("lit-nothing"),pt=new WeakMap,y=$.createTreeWalker($,129);function gt(r,t){if(!Y(r)||!r.hasOwnProperty("raw"))throw Error("invalid template strings array");return ot!==void 0?ot.createHTML(t):t}var Et=(r,t)=>{let e=r.length-1,s=[],i,o=t===2?"<svg>":t===3?"<math>":"",n=S;for(let c=0;c<e;c++){let a=r[c],l,h,p=-1,g=0;for(;g<a.length&&(n.lastIndex=g,h=n.exec(a),h!==null);)g=n.lastIndex,n===S?h[1]==="!--"?n=at:h[1]!==void 0?n=nt:h[2]!==void 0?(ut.test(h[2])&&(i=RegExp("</"+h[2],"g")),n=v):h[3]!==void 0&&(n=v):n===v?h[0]===">"?(n=i??S,p=-1):h[1]===void 0?p=-2:(p=n.lastIndex-h[2].length,l=h[1],n=h[3]===void 0?v:h[3]==='"'?dt:ct):n===dt||n===ct?n=v:n===at||n===nt?n=S:(n=v,i=void 0);let f=n===v&&r[c+1].startsWith("/>")?" ":"";o+=n===S?a+At:p>=0?(s.push(l),a.slice(0,p)+lt+a.slice(p)+_+f):a+_+(p===-2?c:f)}return[gt(r,o+(r[e]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),s]},C=class r{constructor({strings:t,_$litType$:e},s){let i;this.parts=[];let o=0,n=0,c=t.length-1,a=this.parts,[l,h]=Et(t,e);if(this.el=r.createElement(l,s),y.currentNode=this.el.content,e===2||e===3){let p=this.el.content.firstChild;p.replaceWith(...p.childNodes)}for(;(i=y.nextNode())!==null&&a.length<c;){if(i.nodeType===1){if(i.hasAttributes())for(let p of i.getAttributeNames())if(p.endsWith(lt)){let g=h[n++],f=i.getAttribute(p).split(_),U=/([.?@])?(.*)/.exec(g);a.push({type:1,index:o,name:U[2],strings:f,ctor:U[1]==="."?W:U[1]==="?"?Z:U[1]==="@"?B:A}),i.removeAttribute(p)}else p.startsWith(_)&&(a.push({type:6,index:o}),i.removeAttribute(p));if(ut.test(i.tagName)){let p=i.textContent.split(_),g=p.length-1;if(g>0){i.textContent=j?j.emptyScript:"";for(let f=0;f<g;f++)i.append(p[f],z()),y.nextNode(),a.push({type:2,index:++o});i.append(p[g],z())}}}else if(i.nodeType===8)if(i.data===ht)a.push({type:2,index:o});else{let p=-1;for(;(p=i.data.indexOf(_,p+1))!==-1;)a.push({type:7,index:o}),p+=_.length-1}o++}}static createElement(t,e){let s=$.createElement("template");return s.innerHTML=t,s}};function w(r,t,e=r,s){if(t===x)return t;let i=s!==void 0?e._$Co?.[s]:e._$Cl,o=P(t)?void 0:t._$litDirective$;return i?.constructor!==o&&(i?._$AO?.(!1),o===void 0?i=void 0:(i=new o(r),i._$AT(r,e,s)),s!==void 0?(e._$Co??=[])[s]=i:e._$Cl=i),i!==void 0&&(t=w(r,i._$AS(r,t.values),i,s)),t}var K=class{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){let{el:{content:e},parts:s}=this._$AD,i=(t?.creationScope??$).importNode(e,!0);y.currentNode=i;let o=y.nextNode(),n=0,c=0,a=s[0];for(;a!==void 0;){if(n===a.index){let l;a.type===2?l=new T(o,o.nextSibling,this,t):a.type===1?l=new a.ctor(o,a.name,a.strings,this,t):a.type===6&&(l=new q(o,this,t)),this._$AV.push(l),a=s[++c]}n!==a?.index&&(o=y.nextNode(),n++)}return y.currentNode=$,i}p(t){let e=0;for(let s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}},T=class r{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,i){this.type=2,this._$AH=u,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode,e=this._$AM;return e!==void 0&&t?.nodeType===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=w(this,t,e),P(t)?t===u||t==null||t===""?(this._$AH!==u&&this._$AR(),this._$AH=u):t!==this._$AH&&t!==x&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):kt(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==u&&P(this._$AH)?this._$AA.nextSibling.data=t:this.T($.createTextNode(t)),this._$AH=t}$(t){let{values:e,_$litType$:s}=t,i=typeof s=="number"?this._$AC(t):(s.el===void 0&&(s.el=C.createElement(gt(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(e);else{let o=new K(i,this),n=o.u(this.options);o.p(e),this.T(n),this._$AH=o}}_$AC(t){let e=pt.get(t.strings);return e===void 0&&pt.set(t.strings,e=new C(t)),e}k(t){Y(this._$AH)||(this._$AH=[],this._$AR());let e=this._$AH,s,i=0;for(let o of t)i===e.length?e.push(s=new r(this.O(z()),this.O(z()),this,this.options)):s=e[i],s._$AI(o),i++;i<e.length&&(this._$AR(s&&s._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){let s=rt(t).nextSibling;rt(t).remove(),t=s}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}},A=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,i,o){this.type=1,this._$AH=u,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=o,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=u}_$AI(t,e=this,s,i){let o=this.strings,n=!1;if(o===void 0)t=w(this,t,e,0),n=!P(t)||t!==this._$AH&&t!==x,n&&(this._$AH=t);else{let c=t,a,l;for(t=o[0],a=0;a<o.length-1;a++)l=w(this,c[s+a],e,a),l===x&&(l=this._$AH[a]),n||=!P(l)||l!==this._$AH[a],l===u?t=u:t!==u&&(t+=(l??"")+o[a+1]),this._$AH[a]=l}n&&!i&&this.j(t)}j(t){t===u?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}},W=class extends A{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===u?void 0:t}},Z=class extends A{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==u)}},B=class extends A{constructor(t,e,s,i,o){super(t,e,s,i,o),this.type=5}_$AI(t,e=this){if((t=w(this,t,e,0)??u)===x)return;let s=this._$AH,i=t===u&&s!==u||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,o=t!==u&&(s===u||i);i&&this.element.removeEventListener(this.name,this,s),o&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}},q=class{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){w(this,t)}};var St=V.litHtmlPolyfillSupport;St?.(C,T),(V.litHtmlVersions??=[]).push("3.3.3");var bt=(r,t,e)=>{let s=e?.renderBefore??t,i=s._$litPart$;if(i===void 0){let o=e?.renderBefore??null;s._$litPart$=i=new T(t.insertBefore(z(),o),o,void 0,e??{})}return i._$AI(r),i};var J=globalThis,m=class extends b{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){let e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=bt(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return x}};m._$litElement$=!0,m.finalized=!0,J.litElementHydrateSupport?.({LitElement:m});var zt=J.litElementPolyfillSupport;zt?.({LitElement:m});(J.litElementVersions??=[]).push("4.2.2");var F=class extends m{static get properties(){return{hass:{type:Object},config:{type:Object},_selectedUserId:{type:String,state:!0},_activeTab:{type:String,state:!0},_pinInput:{type:String,state:!0},_pinError:{type:String,state:!0},_unlockedUsers:{type:Object,state:!0},_pendingPinUser:{type:Object,state:!0},_notification:{type:String,state:!0}}}constructor(){super(),this.config={},this._selectedUserId="",this._activeTab="tasks",this._pinInput="",this._pinError="",this._unlockedUsers={},this._pendingPinUser=null,this._notification=""}setConfig(t){if(!t)throw new Error("Brak konfiguracji karty");this.config={title:"KiddosPoints - Zadania i Nagrody",show_rewards:!0,show_pc_time:!0,...t}}getCardSize(){return 5}_showToast(t){this._notification=t,setTimeout(()=>{this._notification=""},3500)}_selectUser(t){if(this._selectedUserId===t.id){this._selectedUserId="";return}if(t.pinCode&&!this._unlockedUsers[t.id]){this._pendingPinUser=t,this._pinInput="",this._pinError="";return}this._selectedUserId=t.id}_verifyPin(){if(this._pendingPinUser)if(this._pinInput===this._pendingPinUser.pinCode){let t=this._pendingPinUser.name;this._unlockedUsers={...this._unlockedUsers,[this._pendingPinUser.id]:!0},this._selectedUserId=this._pendingPinUser.id,this._pendingPinUser=null,this._pinInput="",this._pinError="",this._showToast(`Zalogowano jako ${t}!`)}else this._pinError="Nieprawid\u0142owy kod PIN!",this._pinInput=""}_cancelPin(){this._pendingPinUser=null,this._pinInput="",this._pinError=""}_completeTask(t){if(!this._selectedUserId){this._showToast("Wybierz sw\xF3j profil powy\u017Cej, aby oznaczy\u0107 zadanie!");return}let e=this._getCurrentUser();if(!e)return;let s=e.requiresApproval??e.role==="child";this.hass.callService("chore_manager","complete_task",{task_id:t.id,task_name:t.name,user:e.haEntityId||e.id,points:t.points||10,requires_approval:s}),s?this._showToast(`Zadanie "${t.name}" zg\u0142oszone do zatwierdzenia przez rodzica!`):this._showToast(`\u015Awietna robota! +${t.points||10} pkt przyznane!`)}_approveTask(t){let e=this._getCurrentUser();if(!e||e.role!=="admin"){this._showToast("Tylko administrator mo\u017Ce zatwierdza\u0107 zadania!");return}this.hass.callService("chore_manager","approve_task",{task_id:t.task_id,user:t.user,points:t.points||10}),this._showToast(`Zatwierdzono zadanie! Przyznano +${t.points} pkt.`)}_rejectTask(t){let e=this._getCurrentUser();if(!e||e.role!=="admin"){this._showToast("Tylko administrator mo\u017Ce odrzuca\u0107 zadania!");return}this.hass.callService("chore_manager","reject_task",{task_id:t.task_id,user:t.user,reason:"Wymaga poprawy"}),this._showToast("Zadanie odrzucone.")}_claimReward(t){let e=this._getCurrentUser();if(!e){this._showToast("Najpierw wybierz sw\xF3j profil!");return}let s=t.title||t.name||"Nagroda",i=t.cost??t.points??0,o=e.points||0;if(o<i){this._showToast(`Brakuje Ci jeszcze ${i-o} pkt na t\u0119 nagrod\u0119!`);return}this.hass.callService("chore_manager","claim_reward",{reward_id:t.id,reward_name:s,cost:i,user:e.haEntityId||e.id}),this._showToast(`Nagroda "${s}" odebrana! Mi\u0142ego korzystania!`)}_getCurrentUser(){return this._getUsers().find(e=>e.id===this._selectedUserId)}_getUsers(){if(!this.hass||!this.hass.states)return[];let t=[];return Object.keys(this.hass.states).forEach(e=>{if(e.startsWith("sensor.chore_points_")){let s=this.hass.states[e],i=s.attributes.friendly_name||e.replace("sensor.chore_points_","");t.push({id:e,haEntityId:e,name:i,points:parseInt(s.state,10)||0,role:s.attributes.role||(i.toLowerCase().includes("tata")||i.toLowerCase().includes("mama")?"admin":"child"),requiresApproval:s.attributes.requires_approval??!i.toLowerCase().includes("tata"),pinCode:s.attributes.pin||(s.attributes.role==="admin"?"1234":""),avatar:s.attributes.avatar||""})}}),t}_getTasks(){if(!this.hass||!this.hass.states)return[];let t=this.hass.states["todo.chore_tasks"];return t&&t.attributes&&t.attributes.tasks||[]}_getPendingApprovals(){if(!this.hass||!this.hass.states)return[];let t=this.hass.states["sensor.chore_manager_pending_approvals"];return t&&t.attributes&&t.attributes.items||[]}_getRewards(){if(!this.hass||!this.hass.states)return[];let t=this.hass.states["sensor.chore_rewards"];return t&&t.attributes&&t.attributes.rewards?t.attributes.rewards:[{id:"r1",title:"1h Komputera / Gry",cost:50,icon:"mdi:laptop"},{id:"r2",title:"Wyb\xF3r obiadu",cost:100,icon:"mdi:food"},{id:"r3",title:"Wyj\u015Bcie do Kina",cost:200,icon:"mdi:movie"},{id:"r4",title:"Kieszonkowe 20 z\u0142",cost:150,icon:"mdi:cash"}]}_getPcTime(){if(!this.hass||!this.hass.states)return[];let t=this.hass.states["sensor.chore_pc_time"];return t&&t.attributes&&t.attributes.slots||[]}render(){if(!this.hass)return d`<ha-card><div class="loading">Ładowanie danych Home Assistant...</div></ha-card>`;let t=this.config.title||"Domowy Manager Zada\u0144",e=this._getUsers(),s=this._getTasks(),i=this._getPendingApprovals(),o=this._getRewards(),n=this._getPcTime(),c=this._getCurrentUser();return d`
      <ha-card>
        <!-- TOAST POWIADOMIENIA -->
        ${this._notification?d`
          <div class="toast-message">
            ${this._notification}
          </div>
        `:""}

        <!-- MODAL WPISYWANIA KODU PIN -->
        ${this._pendingPinUser?d`
          <div class="pin-modal-overlay">
            <div class="pin-modal-box">
              <div class="pin-title">Podaj PIN dla ${this._pendingPinUser.name}</div>
              <p class="pin-subtitle">Profil jest zabezpieczony 4-cyfrowym kodem</p>
              
              <div class="pin-display">
                ${["","","",""].map((a,l)=>d`
                  <span class="pin-dot ${this._pinInput.length>l?"filled":""}"></span>
                `)}
              </div>

              ${this._pinError?d`<div class="pin-error">${this._pinError}</div>`:""}

              <!-- KLAWIATURA PIN -->
              <div class="pin-keypad">
                ${[1,2,3,4,5,6,7,8,9].map(a=>d`
                  <button 
                    class="pin-key" 
                    @click=${()=>{this._pinInput.length<4&&(this._pinInput+=a.toString(),this._pinInput.length===4&&setTimeout(()=>this._verifyPin(),150))}}
                  >
                    ${a}
                  </button>
                `)}
                <button class="pin-key action" @click=${()=>this._cancelPin()}>Anuluj</button>
                <button 
                  class="pin-key" 
                  @click=${()=>{this._pinInput.length<4&&(this._pinInput+="0",this._pinInput.length===4&&setTimeout(()=>this._verifyPin(),150))}}
                >
                  0
                </button>
                <button 
                  class="pin-key action" 
                  @click=${()=>{this._pinInput=this._pinInput.slice(0,-1)}}
                >
                  ⌫
                </button>
              </div>
            </div>
          </div>
        `:""}

        <!-- NAGŁÓWEK KARTY -->
        <div class="card-header">
          <div class="header-title-row">
            <h2 class="card-title">${t}</h2>
            ${c?d`
              <span class="current-role-badge ${c.role}">
                ${c.role==="admin"?"\u{1F6E1}\uFE0F Administrator":"\u2B50 Podopieczny"}
              </span>
            `:""}
          </div>
          
          <!-- LISTA PROFILI DOMOWNIKÓW -->
          <div class="users-bar">
            ${e.map(a=>{let l=this._selectedUserId===a.id;return d`
                <div 
                  class="user-pill ${l?"active":""}" 
                  @click=${()=>this._selectUser(a)}
                >
                  <div class="user-avatar">
                    ${a.name.charAt(0).toUpperCase()}
                  </div>
                  <div class="user-details">
                    <span class="user-name">${a.name}</span>
                    <span class="user-points-text">${a.points} pkt</span>
                  </div>
                  ${a.pinCode?d`<span class="pin-indicator" title="Wymaga PIN">🔒</span>`:""}
                </div>
              `})}
          </div>
        </div>

        <!-- ZAKŁADKI KARTY (TABS) -->
        <div class="tabs-nav">
          <button 
            class="tab-btn ${this._activeTab==="tasks"?"active":""}" 
            @click=${()=>{this._activeTab="tasks"}}
          >
            🧹 Zadania (${s.length})
          </button>
          
          <button 
            class="tab-btn ${this._activeTab==="approvals"?"active":""}" 
            @click=${()=>{this._activeTab="approvals"}}
          >
            ⏳ Do akceptacji ${i.length>0?d`<span class="badge-count">${i.length}</span>`:""}
          </button>

          ${this.config.show_rewards!==!1?d`
            <button 
              class="tab-btn ${this._activeTab==="rewards"?"active":""}" 
              @click=${()=>{this._activeTab="rewards"}}
            >
              🎁 Sklep (${o.length})
            </button>
          `:""}

          ${this.config.show_pc_time!==!1?d`
            <button 
              class="tab-btn ${this._activeTab==="pctime"?"active":""}" 
              @click=${()=>{this._activeTab="pctime"}}
            >
              💻 Czas PC
            </button>
          `:""}
        </div>

        <!-- ZAWARTOŚĆ AKTYWNEJ ZAKŁADKI -->
        <div class="tab-content">
          
          <!-- ZAKŁADKA 1: ZADANIA -->
          ${this._activeTab==="tasks"?d`
            <div class="tasks-container">
              ${s.length===0?d`
                <div class="empty-state">
                  <div class="empty-icon">🎉</div>
                  <div class="empty-text">Wszystkie zadania wykonane! Wspaniale!</div>
                </div>
              `:s.map(a=>d`
                  <div class="task-card">
                    <div class="task-info">
                      <div class="task-title-row">
                        <span class="task-title">${a.name}</span>
                        <span class="task-badge">+${a.points||10} pkt</span>
                      </div>
                      ${a.assigned_to?d`<div class="task-assignee">Przydzielone: <strong>${a.assigned_to}</strong></div>`:""}
                    </div>
                    <button 
                      class="btn-action ${this._selectedUserId?"":"btn-disabled"}" 
                      @click=${()=>this._completeTask(a)}
                    >
                      ${c&&(c.requiresApproval??c.role==="child")?"Zg\u0142o\u015B wykonanie":"Zrobione!"}
                    </button>
                  </div>
                `)}
            </div>
          `:""}

          <!-- ZAKŁADKA 2: DO AKCEPTACJI -->
          ${this._activeTab==="approvals"?d`
            <div class="approvals-container">
              ${i.length===0?d`
                <div class="empty-state">
                  <div class="empty-icon">✅</div>
                  <div class="empty-text">Brak zgłoszeń oczekujących na weryfikację rodziców.</div>
                </div>
              `:i.map(a=>{let l=c&&c.role==="admin";return d`
                  <div class="approval-card">
                    <div class="approval-info">
                      <div class="approval-task-name">${a.task_name||a.task_id}</div>
                      <div class="approval-meta">
                        Zgłosił(a): <strong>${a.user_name||a.user}</strong> • Nagroda: <strong>+${a.points} pkt</strong>
                      </div>
                    </div>
                    ${l?d`
                      <div class="approval-actions">
                        <button class="btn-reject" @click=${()=>this._rejectTask(a)}>Odrzuć</button>
                        <button class="btn-approve" @click=${()=>this._approveTask(a)}>Zatwierdź</button>
                      </div>
                    `:d`
                      <span class="approval-waiting-badge">Oczekuje na rodzica</span>
                    `}
                  </div>
                `})}
            </div>
          `:""}

          <!-- ZAKŁADKA 3: SKLEP Z NAGRODAMI -->
          ${this._activeTab==="rewards"?d`
            <div class="rewards-grid">
              ${o.map(a=>{let l=a.title||a.name||"Nagroda",h=a.cost??a.points??0,p=c?c.points:0,g=c&&p>=h;return d`
                  <div class="reward-item ${g?"can-afford":""}">
                    <div class="reward-top">
                      <span class="reward-title">${l}</span>
                      <span class="reward-cost">${h} pkt</span>
                    </div>
                    <p class="reward-hint">
                      ${c?g?"Mo\u017Cesz odebra\u0107!":`Brakuje ${h-p} pkt`:"Wybierz profil"}
                    </p>
                    <button 
                      class="btn-reward ${g?"":"btn-disabled"}" 
                      ?disabled=${!g}
                      @click=${()=>this._claimReward(a)}
                    >
                      Odbierz nagrodę
                    </button>
                  </div>
                `})}
            </div>
          `:""}

          <!-- ZAKŁADKA 4: CZAS PC -->
          ${this._activeTab==="pctime"?d`
            <div class="pc-time-container">
              <p class="section-desc">Przydział czasu gry / komputera na dzisiaj według zdobytych punktów i harmonogramu:</p>
              ${n.length===0?d`
                <div class="empty-state">Brak skonfigurowanych limitów czasu PC.</div>
              `:n.map(a=>d`
                <div class="pc-slot-row">
                  <span class="pc-person-name">💻 ${a.name}</span>
                  <span class="pc-hours-badge">${a.minutes||60} minut</span>
                </div>
              `)}
            </div>
          `:""}

        </div>
      </ha-card>
    `}static get styles(){return M`
      :host {
        display: block;
        font-family: var(--ha-card-header-font-family, inherit);
      }
      ha-card {
        background: var(--ha-card-background, var(--card-background-color, #1e1e24));
        border-radius: var(--ha-card-border-radius, 16px);
        box-shadow: var(--ha-card-box-shadow, 0 4px 20px rgba(0,0,0,0.15));
        color: var(--primary-text-color, #f1f5f9);
        overflow: hidden;
        position: relative;
      }
      .toast-message {
        position: absolute;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--primary-color, #3b82f6);
        color: white;
        padding: 8px 18px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        z-index: 100;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: fadeIn 0.2s ease-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, -10px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
      .card-header {
        padding: 18px 20px 14px 20px;
        border-bottom: 1px solid var(--divider-color, rgba(255,255,255,0.08));
      }
      .header-title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
      }
      .card-title {
        margin: 0;
        font-size: 19px;
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      .current-role-badge {
        font-size: 12px;
        padding: 4px 10px;
        border-radius: 20px;
        font-weight: 600;
      }
      .current-role-badge.admin {
        background: rgba(168, 85, 247, 0.2);
        color: #c084fc;
        border: 1px solid rgba(168, 85, 247, 0.4);
      }
      .current-role-badge.child {
        background: rgba(59, 130, 246, 0.2);
        color: #60a5fa;
        border: 1px solid rgba(59, 130, 246, 0.4);
      }
      .users-bar {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        padding-bottom: 4px;
        scrollbar-width: none;
      }
      .users-bar::-webkit-scrollbar {
        display: none;
      }
      .user-pill {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--secondary-background-color, rgba(255,255,255,0.06));
        border: 2px solid transparent;
        padding: 6px 12px 6px 6px;
        border-radius: 28px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        min-width: max-content;
      }
      .user-pill:hover {
        background: var(--divider-color, rgba(255,255,255,0.12));
      }
      .user-pill.active {
        border-color: var(--primary-color, #3b82f6);
        background: rgba(59, 130, 246, 0.15);
      }
      .user-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--primary-color, #3b82f6);
        color: white;
        font-weight: bold;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .user-details {
        display: flex;
        flex-direction: column;
      }
      .user-name {
        font-size: 13px;
        font-weight: 600;
        line-height: 1.1;
      }
      .user-points-text {
        font-size: 11px;
        color: var(--primary-color, #3b82f6);
        font-weight: 700;
      }
      .pin-indicator {
        font-size: 11px;
      }

      /* TABS NAVIGATION */
      .tabs-nav {
        display: flex;
        background: var(--secondary-background-color, rgba(255,255,255,0.03));
        border-bottom: 1px solid var(--divider-color, rgba(255,255,255,0.08));
        overflow-x: auto;
      }
      .tab-btn {
        flex: 1;
        padding: 12px 8px;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: var(--secondary-text-color, #94a3b8);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        white-space: nowrap;
      }
      .tab-btn:hover {
        color: var(--primary-text-color, #ffffff);
      }
      .tab-btn.active {
        color: var(--primary-color, #3b82f6);
        border-bottom-color: var(--primary-color, #3b82f6);
      }
      .badge-count {
        background: var(--error-color, #ef4444);
        color: white;
        border-radius: 10px;
        padding: 1px 6px;
        font-size: 10px;
        font-weight: bold;
      }

      /* CONTENT AREA */
      .tab-content {
        padding: 16px 20px 20px 20px;
      }
      .tasks-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .task-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--secondary-background-color, rgba(255,255,255,0.05));
        border: 1px solid var(--divider-color, rgba(255,255,255,0.08));
        border-radius: 12px;
        padding: 12px 16px;
        transition: transform 0.15s, background 0.15s;
      }
      .task-card:hover {
        background: var(--divider-color, rgba(255,255,255,0.08));
      }
      .task-info {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .task-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .task-title {
        font-weight: 600;
        font-size: 14px;
      }
      .task-badge {
        background: rgba(34, 197, 94, 0.18);
        color: #4ade80;
        font-weight: bold;
        font-size: 11px;
        padding: 2px 7px;
        border-radius: 12px;
      }
      .task-assignee {
        font-size: 11px;
        color: var(--secondary-text-color, #94a3b8);
      }
      .btn-action {
        background: var(--primary-color, #3b82f6);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 14px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s, transform 0.1s;
      }
      .btn-action:hover:not(.btn-disabled) {
        opacity: 0.9;
        transform: translateY(-1px);
      }
      .btn-disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      /* APPROVALS */
      .approvals-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .approval-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--secondary-background-color, rgba(255,255,255,0.05));
        border-radius: 12px;
        padding: 12px 16px;
        border: 1px solid rgba(234, 179, 8, 0.3);
      }
      .approval-task-name {
        font-weight: 600;
        font-size: 14px;
      }
      .approval-meta {
        font-size: 11px;
        color: var(--secondary-text-color, #94a3b8);
      }
      .approval-actions {
        display: flex;
        gap: 6px;
      }
      .btn-approve {
        background: #22c55e;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-reject {
        background: #ef4444;
        color: white;
        border: none;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .approval-waiting-badge {
        font-size: 11px;
        color: #eab308;
        background: rgba(234, 179, 8, 0.15);
        padding: 4px 10px;
        border-radius: 12px;
        font-weight: 600;
      }

      /* REWARDS */
      .rewards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 12px;
      }
      .reward-item {
        background: var(--secondary-background-color, rgba(255,255,255,0.05));
        border: 1px solid var(--divider-color, rgba(255,255,255,0.08));
        border-radius: 12px;
        padding: 14px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .reward-item.can-afford {
        border-color: rgba(34, 197, 94, 0.4);
      }
      .reward-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 6px;
      }
      .reward-title {
        font-weight: 600;
        font-size: 13px;
      }
      .reward-cost {
        font-weight: 800;
        color: #eab308;
        font-size: 13px;
      }
      .reward-hint {
        font-size: 11px;
        color: var(--secondary-text-color, #94a3b8);
        margin: 0 0 10px 0;
      }
      .btn-reward {
        background: var(--primary-color, #3b82f6);
        color: white;
        border: none;
        padding: 8px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }

      /* PC TIME */
      .pc-time-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .section-desc {
        font-size: 12px;
        color: var(--secondary-text-color, #94a3b8);
        margin: 0 0 6px 0;
      }
      .pc-slot-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--secondary-background-color, rgba(255,255,255,0.05));
        padding: 12px 16px;
        border-radius: 10px;
      }
      .pc-person-name {
        font-weight: 600;
        font-size: 14px;
      }
      .pc-hours-badge {
        background: rgba(59, 130, 246, 0.2);
        color: #60a5fa;
        font-weight: bold;
        font-size: 12px;
        padding: 3px 10px;
        border-radius: 12px;
      }

      .empty-state {
        text-align: center;
        padding: 32px 16px;
        color: var(--secondary-text-color, #94a3b8);
      }
      .empty-icon {
        font-size: 32px;
        margin-bottom: 6px;
      }
      .empty-text {
        font-size: 13px;
      }

      /* PIN MODAL */
      .pin-modal-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.85);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 50;
        padding: 20px;
      }
      .pin-modal-box {
        background: var(--card-background-color, #1e293b);
        border: 1px solid var(--divider-color, rgba(255,255,255,0.1));
        padding: 24px;
        border-radius: 20px;
        width: 100%;
        max-width: 280px;
        text-align: center;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
      }
      .pin-title {
        font-weight: 700;
        font-size: 16px;
        margin-bottom: 4px;
      }
      .pin-subtitle {
        font-size: 12px;
        color: var(--secondary-text-color, #94a3b8);
        margin: 0 0 16px 0;
      }
      .pin-display {
        display: flex;
        justify-content: center;
        gap: 12px;
        margin-bottom: 14px;
      }
      .pin-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid var(--primary-color, #3b82f6);
        transition: background 0.15s;
      }
      .pin-dot.filled {
        background: var(--primary-color, #3b82f6);
      }
      .pin-error {
        color: #ef4444;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 12px;
      }
      .pin-keypad {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
      .pin-key {
        background: rgba(255,255,255,0.08);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s, transform 0.05s;
      }
      .pin-key:hover {
        background: rgba(255,255,255,0.15);
      }
      .pin-key:active {
        transform: scale(0.95);
      }
      .pin-key.action {
        font-size: 12px;
        background: transparent;
        color: var(--secondary-text-color, #94a3b8);
      }
    `}};customElements.get("chore-manager-card")||customElements.define("chore-manager-card",F);window.customCards=window.customCards||[];window.customCards.push({type:"chore-manager-card",name:"KiddosPoints (Lovelace Card)",preview:!0,description:"Zarz\u0105dzanie zadaniami domowymi, punktami, akceptacj\u0105 rodzica i sklepem z nagrodami."});})();
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
lit-html/lit-html.js:
lit-element/lit-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
