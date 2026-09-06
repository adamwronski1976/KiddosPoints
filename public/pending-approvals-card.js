(()=>{var O=globalThis,R=O.ShadowRoot&&(O.ShadyCSS===void 0||O.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,N=Symbol(),X=new WeakMap,E=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==N)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o,e=this.t;if(R&&t===void 0){let s=e!==void 0&&e.length===1;s&&(t=X.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&X.set(e,t))}return t}toString(){return this.cssText}},Y=r=>new E(typeof r=="string"?r:r+"",void 0,N),T=(r,...t)=>{let e=r.length===1?r[0]:t.reduce((s,i,n)=>s+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+r[n+1],r[0]);return new E(e,r,N)},tt=(r,t)=>{if(R)r.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let e of t){let s=document.createElement("style"),i=O.litNonce;i!==void 0&&s.setAttribute("nonce",i),s.textContent=e.cssText,r.appendChild(s)}},L=R?r=>r:r=>r instanceof CSSStyleSheet?(t=>{let e="";for(let s of t.cssRules)e+=s.cssText;return Y(e)})(r):r;var{is:mt,defineProperty:ft,getOwnPropertyDescriptor:gt,getOwnPropertyNames:yt,getOwnPropertySymbols:vt,getPrototypeOf:At}=Object,H=globalThis,et=H.trustedTypes,bt=et?et.emptyScript:"",xt=H.reactiveElementPolyfillSupport,w=(r,t)=>r,D={toAttribute(r,t){switch(t){case Boolean:r=r?bt:null;break;case Object:case Array:r=r==null?r:JSON.stringify(r)}return r},fromAttribute(r,t){let e=r;switch(t){case Boolean:e=r!==null;break;case Number:e=r===null?null:Number(r);break;case Object:case Array:try{e=JSON.parse(r)}catch{e=null}}return e}},it=(r,t)=>!mt(r,t),st={attribute:!0,type:String,converter:D,reflect:!1,useDefault:!1,hasChanged:it};Symbol.metadata??=Symbol("metadata"),H.litPropertyMetadata??=new WeakMap;var _=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=st){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){let s=Symbol(),i=this.getPropertyDescriptor(t,s,e);i!==void 0&&ft(this.prototype,t,i)}}static getPropertyDescriptor(t,e,s){let{get:i,set:n}=gt(this.prototype,t)??{get(){return this[e]},set(o){this[e]=o}};return{get:i,set(o){let c=i?.call(this);n?.call(this,o),this.requestUpdate(t,c,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??st}static _$Ei(){if(this.hasOwnProperty(w("elementProperties")))return;let t=At(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(w("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(w("properties"))){let e=this.properties,s=[...yt(e),...vt(e)];for(let i of s)this.createProperty(i,e[i])}let t=this[Symbol.metadata];if(t!==null){let e=litPropertyMetadata.get(t);if(e!==void 0)for(let[s,i]of e)this.elementProperties.set(s,i)}this._$Eh=new Map;for(let[e,s]of this.elementProperties){let i=this._$Eu(e,s);i!==void 0&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){let e=[];if(Array.isArray(t)){let s=new Set(t.flat(1/0).reverse());for(let i of s)e.unshift(L(i))}else t!==void 0&&e.push(L(t));return e}static _$Eu(t,e){let s=e.attribute;return s===!1?void 0:typeof s=="string"?s:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){let t=new Map,e=this.constructor.elementProperties;for(let s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){let t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return tt(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){let s=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,s);if(i!==void 0&&s.reflect===!0){let n=(s.converter?.toAttribute!==void 0?s.converter:D).toAttribute(e,s.type);this._$Em=t,n==null?this.removeAttribute(i):this.setAttribute(i,n),this._$Em=null}}_$AK(t,e){let s=this.constructor,i=s._$Eh.get(t);if(i!==void 0&&this._$Em!==i){let n=s.getPropertyOptions(i),o=typeof n.converter=="function"?{fromAttribute:n.converter}:n.converter?.fromAttribute!==void 0?n.converter:D;this._$Em=i;let c=o.fromAttribute(e,n.type);this[i]=c??this._$Ej?.get(i)??c,this._$Em=null}}requestUpdate(t,e,s,i=!1,n){if(t!==void 0){let o=this.constructor;if(i===!1&&(n=this[t]),s??=o.getPropertyOptions(t),!((s.hasChanged??it)(n,e)||s.useDefault&&s.reflect&&n===this._$Ej?.get(t)&&!this.hasAttribute(o._$Eu(t,s))))return;this.C(t,e,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:i,wrapped:n},o){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,o??e??this[t]),n!==!0||o!==void 0)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),i===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[i,n]of this._$Ep)this[i]=n;this._$Ep=void 0}let s=this.constructor.elementProperties;if(s.size>0)for(let[i,n]of s){let{wrapped:o}=n,c=this[i];o!==!0||this._$AL.has(i)||c===void 0||this.C(i,void 0,n,c)}}let t=!1,e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(s=>s.hostUpdate?.()),this.update(e)):this._$EM()}catch(s){throw t=!1,this._$EM(),s}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(t){}firstUpdated(t){}};_.elementStyles=[],_.shadowRootOptions={mode:"open"},_[w("elementProperties")]=new Map,_[w("finalized")]=new Map,xt?.({ReactiveElement:_}),(H.reactiveElementVersions??=[]).push("2.1.2");var Z=globalThis,rt=r=>r,M=Z.trustedTypes,nt=M?M.createPolicy("lit-html",{createHTML:r=>r}):void 0,dt="$lit$",m=`lit$${Math.random().toFixed(9).slice(2)}$`,pt="?"+m,St=`<${pt}>`,v=document,j=()=>v.createComment(""),k=r=>r===null||typeof r!="object"&&typeof r!="function",F=Array.isArray,Et=r=>F(r)||typeof r?.[Symbol.iterator]=="function",I=`[ 	
\f\r]`,C=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ot=/-->/g,at=/>/g,g=RegExp(`>|${I}(?:([^\\s"'>=/]+)(${I}*=${I}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),ht=/'/g,ct=/"/g,ut=/^(?:script|style|textarea|title)$/i,J=r=>(t,...e)=>({_$litType$:r,strings:t,values:e}),b=J(1),Ot=J(2),Rt=J(3),A=Symbol.for("lit-noChange"),d=Symbol.for("lit-nothing"),lt=new WeakMap,y=v.createTreeWalker(v,129);function _t(r,t){if(!F(r)||!r.hasOwnProperty("raw"))throw Error("invalid template strings array");return nt!==void 0?nt.createHTML(t):t}var wt=(r,t)=>{let e=r.length-1,s=[],i,n=t===2?"<svg>":t===3?"<math>":"",o=C;for(let c=0;c<e;c++){let a=r[c],l,p,h=-1,u=0;for(;u<a.length&&(o.lastIndex=u,p=o.exec(a),p!==null);)u=o.lastIndex,o===C?p[1]==="!--"?o=ot:p[1]!==void 0?o=at:p[2]!==void 0?(ut.test(p[2])&&(i=RegExp("</"+p[2],"g")),o=g):p[3]!==void 0&&(o=g):o===g?p[0]===">"?(o=i??C,h=-1):p[1]===void 0?h=-2:(h=o.lastIndex-p[2].length,l=p[1],o=p[3]===void 0?g:p[3]==='"'?ct:ht):o===ct||o===ht?o=g:o===ot||o===at?o=C:(o=g,i=void 0);let $=o===g&&r[c+1].startsWith("/>")?" ":"";n+=o===C?a+St:h>=0?(s.push(l),a.slice(0,h)+dt+a.slice(h)+m+$):a+m+(h===-2?c:$)}return[_t(r,n+(r[e]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),s]},P=class r{constructor({strings:t,_$litType$:e},s){let i;this.parts=[];let n=0,o=0,c=t.length-1,a=this.parts,[l,p]=wt(t,e);if(this.el=r.createElement(l,s),y.currentNode=this.el.content,e===2||e===3){let h=this.el.content.firstChild;h.replaceWith(...h.childNodes)}for(;(i=y.nextNode())!==null&&a.length<c;){if(i.nodeType===1){if(i.hasAttributes())for(let h of i.getAttributeNames())if(h.endsWith(dt)){let u=p[o++],$=i.getAttribute(h).split(m),U=/([.?@])?(.*)/.exec(u);a.push({type:1,index:n,name:U[2],strings:$,ctor:U[1]==="."?V:U[1]==="?"?W:U[1]==="@"?q:S}),i.removeAttribute(h)}else h.startsWith(m)&&(a.push({type:6,index:n}),i.removeAttribute(h));if(ut.test(i.tagName)){let h=i.textContent.split(m),u=h.length-1;if(u>0){i.textContent=M?M.emptyScript:"";for(let $=0;$<u;$++)i.append(h[$],j()),y.nextNode(),a.push({type:2,index:++n});i.append(h[u],j())}}}else if(i.nodeType===8)if(i.data===pt)a.push({type:2,index:n});else{let h=-1;for(;(h=i.data.indexOf(m,h+1))!==-1;)a.push({type:7,index:n}),h+=m.length-1}n++}}static createElement(t,e){let s=v.createElement("template");return s.innerHTML=t,s}};function x(r,t,e=r,s){if(t===A)return t;let i=s!==void 0?e._$Co?.[s]:e._$Cl,n=k(t)?void 0:t._$litDirective$;return i?.constructor!==n&&(i?._$AO?.(!1),n===void 0?i=void 0:(i=new n(r),i._$AT(r,e,s)),s!==void 0?(e._$Co??=[])[s]=i:e._$Cl=i),i!==void 0&&(t=x(r,i._$AS(r,t.values),i,s)),t}var B=class{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){let{el:{content:e},parts:s}=this._$AD,i=(t?.creationScope??v).importNode(e,!0);y.currentNode=i;let n=y.nextNode(),o=0,c=0,a=s[0];for(;a!==void 0;){if(o===a.index){let l;a.type===2?l=new z(n,n.nextSibling,this,t):a.type===1?l=new a.ctor(n,a.name,a.strings,this,t):a.type===6&&(l=new K(n,this,t)),this._$AV.push(l),a=s[++c]}o!==a?.index&&(n=y.nextNode(),o++)}return y.currentNode=v,i}p(t){let e=0;for(let s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}},z=class r{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,i){this.type=2,this._$AH=d,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode,e=this._$AM;return e!==void 0&&t?.nodeType===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=x(this,t,e),k(t)?t===d||t==null||t===""?(this._$AH!==d&&this._$AR(),this._$AH=d):t!==this._$AH&&t!==A&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):Et(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==d&&k(this._$AH)?this._$AA.nextSibling.data=t:this.T(v.createTextNode(t)),this._$AH=t}$(t){let{values:e,_$litType$:s}=t,i=typeof s=="number"?this._$AC(t):(s.el===void 0&&(s.el=P.createElement(_t(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(e);else{let n=new B(i,this),o=n.u(this.options);n.p(e),this.T(o),this._$AH=n}}_$AC(t){let e=lt.get(t.strings);return e===void 0&&lt.set(t.strings,e=new P(t)),e}k(t){F(this._$AH)||(this._$AH=[],this._$AR());let e=this._$AH,s,i=0;for(let n of t)i===e.length?e.push(s=new r(this.O(j()),this.O(j()),this,this.options)):s=e[i],s._$AI(n),i++;i<e.length&&(this._$AR(s&&s._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){let s=rt(t).nextSibling;rt(t).remove(),t=s}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}},S=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,i,n){this.type=1,this._$AH=d,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=n,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=d}_$AI(t,e=this,s,i){let n=this.strings,o=!1;if(n===void 0)t=x(this,t,e,0),o=!k(t)||t!==this._$AH&&t!==A,o&&(this._$AH=t);else{let c=t,a,l;for(t=n[0],a=0;a<n.length-1;a++)l=x(this,c[s+a],e,a),l===A&&(l=this._$AH[a]),o||=!k(l)||l!==this._$AH[a],l===d?t=d:t!==d&&(t+=(l??"")+n[a+1]),this._$AH[a]=l}o&&!i&&this.j(t)}j(t){t===d?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}},V=class extends S{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===d?void 0:t}},W=class extends S{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==d)}},q=class extends S{constructor(t,e,s,i,n){super(t,e,s,i,n),this.type=5}_$AI(t,e=this){if((t=x(this,t,e,0)??d)===A)return;let s=this._$AH,i=t===d&&s!==d||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,n=t!==d&&(s===d||i);i&&this.element.removeEventListener(this.name,this,s),n&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}},K=class{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){x(this,t)}};var Ct=Z.litHtmlPolyfillSupport;Ct?.(P,z),(Z.litHtmlVersions??=[]).push("3.3.3");var $t=(r,t,e)=>{let s=e?.renderBefore??t,i=s._$litPart$;if(i===void 0){let n=e?.renderBefore??null;s._$litPart$=i=new z(t.insertBefore(j(),n),n,void 0,e??{})}return i._$AI(r),i};var G=globalThis,f=class extends _{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){let e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=$t(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return A}};f._$litElement$=!0,f.finalized=!0,G.litElementHydrateSupport?.({LitElement:f});var jt=G.litElementPolyfillSupport;jt?.({LitElement:f});(G.litElementVersions??=[]).push("4.2.2");var Q=class extends f{static get properties(){return{hass:{type:Object},config:{type:Object},_rejectingId:{type:String,state:!0},_rejectComment:{type:String,state:!0}}}constructor(){super(),this.config={},this._rejectingId=null,this._rejectComment=""}setConfig(t){this.config={title:"Do zatwierdzenia",...t}}getCardSize(){return 3}_items(){return this.hass?.states?.["sensor.chore_manager_pending_approvals"]?.attributes?.items||[]}_approve(t){this.hass.callService("chore_manager","approve_task",{task_id:t.task_id,user:t.user,points:t.points||0})}_startReject(t){this._rejectingId=t.id,this._rejectComment=""}_cancelReject(){this._rejectingId=null,this._rejectComment=""}_confirmReject(t){this.hass.callService("chore_manager","reject_task",{task_id:t.task_id,user:t.user,reason:this._rejectComment.trim()||"Niewykonane poprawnie"}),this._rejectingId=null,this._rejectComment=""}render(){if(!this.hass)return b``;let t=this._items();return b`
      <ha-card .header=${this.config.title}>
        <div class="content">
          ${t.length===0?b`
            <div class="empty-state">
              <div class="empty-icon">✅</div>
              <div>Brak zgłoszeń oczekujących na zatwierdzenie.</div>
            </div>
          `:t.map(e=>b`
            <div class="item">
              <div class="item-row">
                <ha-icon icon=${e.task_icon||"mdi:checkbox-marked-circle-outline"}></ha-icon>
                <div class="item-info">
                  <div class="task-name">${e.task_name||e.task_id}</div>
                  <div class="meta">Zgłosił(a): <strong>${e.user_name||e.user}</strong> · +${e.points} pkt</div>
                </div>
                ${this._rejectingId!==e.id?b`
                  <div class="actions">
                    <button class="btn-reject" @click=${()=>this._startReject(e)}>Odrzuć</button>
                    <button class="btn-approve" @click=${()=>this._approve(e)}>Zatwierdź</button>
                  </div>
                `:""}
              </div>
              ${this._rejectingId===e.id?b`
                <div class="reject-panel">
                  <input
                    type="text"
                    placeholder="Komentarz dla dziecka (opcjonalnie) - co poprawić?"
                    .value=${this._rejectComment}
                    @input=${s=>{this._rejectComment=s.target.value}}
                  />
                  <div class="reject-actions">
                    <button class="btn-cancel" @click=${()=>this._cancelReject()}>Anuluj</button>
                    <button class="btn-reject-confirm" @click=${()=>this._confirmReject(e)}>Odrzuć zadanie</button>
                  </div>
                </div>
              `:""}
            </div>
          `)}
        </div>
      </ha-card>
    `}static get styles(){return T`
      .content {
        padding: 8px 16px 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .empty-state {
        text-align: center;
        padding: 24px 8px;
        color: var(--secondary-text-color, #94a3b8);
      }
      .empty-icon {
        font-size: 28px;
        margin-bottom: 6px;
      }
      .item {
        background: rgba(234, 179, 8, 0.08);
        border: 1px solid rgba(234, 179, 8, 0.3);
        border-radius: 10px;
        padding: 10px 12px;
      }
      .item-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .item-info {
        flex: 1;
        min-width: 0;
      }
      .task-name {
        font-weight: 600;
        font-size: 14px;
      }
      .meta {
        font-size: 11px;
        color: var(--secondary-text-color, #94a3b8);
      }
      .actions {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
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
      .reject-panel {
        margin-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .reject-panel input {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 10px;
        border-radius: 6px;
        border: 1px solid var(--divider-color, rgba(127,127,127,0.3));
        background: var(--card-background-color, white);
        color: var(--primary-text-color, black);
        font-size: 13px;
      }
      .reject-actions {
        display: flex;
        justify-content: flex-end;
        gap: 6px;
      }
      .btn-cancel {
        background: transparent;
        color: var(--secondary-text-color, #94a3b8);
        border: 1px solid var(--divider-color, rgba(127,127,127,0.3));
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-reject-confirm {
        background: #ef4444;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
    `}};customElements.define("pending-approvals-card",Q);window.customCards=window.customCards||[];window.customCards.push({type:"pending-approvals-card",name:"KiddosPoints - Do zatwierdzenia",description:"Kolejka zada\u0144 oczekuj\u0105cych na zatwierdzenie rodzica, z odrzuceniem po komentarzu."});})();
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
