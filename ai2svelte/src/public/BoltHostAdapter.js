/*
ADOBE SYSTEMS INCORPORATED
Copyright 2013 Adobe Systems Incorporated. All Rights Reserved.

NOTICE:  Adobe permits you to use, modify, and distribute this file in 
accordance with the terms of the Adobe license agreement accompanying it.  
If you have received this file from a source other than Adobe, then your 
use, modification, or distribution of it requires the prior written 
permission of Adobe.
*/

import { CSInterface, CSEvent } from "../js/lib/cep/csinterface";

/**
 * EventAdapter provides the base implementation for Creative Cloud
 * application-specific event adapter libraries.
 *
 * EventAdapter should not be instantiated directly to communicate with a host
 * application. Instead, use the application-specific inheritance of this object.
 * For example, to register listeners for Photoshop events, use the
 * PSEventAdapter.
 */
function EventAdapter(adapterNamespace) {
  // Assigned in constructor, vary according to subclass's namespace
  this.ADD_EVENT_LISTENER_EVENT = this.initQualifiedEventName(
    adapterNamespace,
    EventAdapter.ADD_EVENT_LISTENER_EVENT_NAME
  );
  this.REMOVE_EVENT_LISTENER_EVENT = this.initQualifiedEventName(
    adapterNamespace,
    EventAdapter.REMOVE_EVENT_LISTENER_EVENT_NAME
  );
  this.CPP_CS_EVENT_EVENT = this.initQualifiedEventName(
    adapterNamespace,
    EventAdapter.CPP_CS_EVENT_EVENT_NAME
  );
  this.PING_REQUEST_EVENT = this.initQualifiedEventName(
    adapterNamespace,
    EventAdapter.PING_REQUEST_EVENT_NAME
  );
  this.PING_RESPONSE_EVENT = this.initQualifiedEventName(
    adapterNamespace,
    EventAdapter.PING_RESPONSE_EVENT_NAME
  );
  this.LIST_EVENTS_REQUEST_EVENT = this.initQualifiedEventName(
    adapterNamespace,
    EventAdapter.LIST_EVENTS_REQUEST_EVENT_NAME
  );
  this.LIST_EVENTS_RESPONSE_EVENT = this.initQualifiedEventName(
    adapterNamespace,
    EventAdapter.LIST_EVENTS_RESPONSE_EVENT_NAME
  );

  this.dispatcherDelegate = this;

  this.userPingResponseHandler;
  this.pingStarted;
  this.userListEventsResponseHandler;

  this.csInterface = new CSInterface();

  this.eventListening = {};
  this.CPP_CS_EVENT_EVENT_added = false;
}

EventAdapter.ADD_EVENT_LISTENER_EVENT_NAME = "AddEventListener";
EventAdapter.REMOVE_EVENT_LISTENER_EVENT_NAME = "RemoveEventListener";
EventAdapter.CPP_CS_EVENT_EVENT_NAME = "CppEvent";
EventAdapter.PING_REQUEST_EVENT_NAME = "PingRequestEvent";
EventAdapter.PING_RESPONSE_EVENT_NAME = "PingResponseEvent";
EventAdapter.LIST_EVENTS_REQUEST_EVENT_NAME = "ListEventsRequestEvent";
EventAdapter.LIST_EVENTS_RESPONSE_EVENT_NAME = "ListEventsResponseEvent";

EventAdapter.prototype.initQualifiedEventName = function (ns, eventName) {
  return ns + "." + eventName;
};

/**
 * Sends a 'ping' message to the host adapter plug-in and dispatches the response
 * to the specified handler.
 *
 * A PingEvent is dispatched to responseHandler either when a response
 * is received from the plug-in or after the specified timeout period.
 *
 * his method provides a means of checking whether the required host adapter
 * plug-in has been loaded by the host application, and therefore whether
 * this library can be used to register event listeners.
 *
 * @param responseHandler A listener function to which the resulting PingEvent
 * will be dispatched
 * @param timeout The number of milliseconds to wait for a response from the host adapter
 * plug-in before it is considered not to be loaded
 */
EventAdapter.prototype.pingPlugIn = function (responseHandler, timeout) {
  if (isNaN(timeout)) timeout = 5000;

  var adapter = this;

  // Only do ping if another ping is not already pending
  if (!this.pingStarted) {
    this.userPingResponseHandler = responseHandler;
    this.csInterface.addEventListener(
      this.PING_RESPONSE_EVENT,
      pingResponseHandler
    );

    // Ping the plug-in
    setTimeout(function () {
      adapter.dispatchToEventAdapter(adapter.PING_REQUEST_EVENT);
    }, timeout);
    this.pingStarted = true;
  } else {
    alert(
      "[EventAdapter]: Failed to ping plug-in - another ping response is pending"
    );
  }

  function pingResponseHandler(event) {
    adapter.csInterface.removeEventListener(
      adapter.PING_RESPONSE_EVENT,
      pingResponseHandler
    );

    // If event type is adapter.PING_RESPONSE_EVENT, we received ping, else ping timed out
    var eventType =
      event.type == adapter.PING_RESPONSE_EVENT
        ? PingEvent.PING_SUCCEEDED
        : PingEvent.PING_TIMED_OUT;

    // Dispatch event to user's ping event handler
    adapter.userPingResponseHandler(new PingEvent(eventType));

    adapter.pingStarted = false;
  }
};

/**
 * Helper method for subclasses which dispatches a CS event with the
 * specified type and XML payload.
 *
 * @param type the type of the CS event to dispatch
 * @param payload the data of the CS event, in well-formed XML
 */
EventAdapter.prototype.dispatchToEventAdapter = function (type, payload) {
  var e = new CSEvent(type, "APPLICATION", this.csInterface.getApplicationID());
  e.data = payload;
  this.csInterface.dispatchEvent(e);
};

EventAdapter.prototype.hasEventListener = function (eventType) {
  return this.eventListening[eventType];
};

/**
 * Registers a listener for the specified event, so that the
 * listener receives notification of the event.
 *
 * The set of allowed values for eventType varies depending on which
 * Creative Cloud application is being targeted. The type of event
 * dispatched to the listener will also vary depending on the target
 * application.
 *
 * @param eventType The unique string identifier of the event to listen for.
 * @param listener The listener function that processes the event.
 */

EventAdapter.prototype.addEventListener = function (
  eventType,
  listener,
  useCapture,
  priority,
  useWeakReference
) {
  useCapture = useCapture === undefined ? false : useCapture;
  priority = priority === undefined ? 0 : priority;
  useWeakReference = useWeakReference === undefined ? false : useWeakReference;

  // Are we currently listening for the specified event type?
  // If not, we'll need to tell the plug-in to start listening for it
  var alreadyListening = this.hasEventListener(eventType);
  var listeners = alreadyListening ? this.eventListening[eventType] : {};
  listeners[listener] = listener;
  this.eventListening[eventType] = listeners;

  var adapter = this;

  if (!this.CPP_CS_EVENT_EVENT_added) {
    this.CPP_CS_EVENT_EVENT_added = true;
    this.csInterface.addEventListener(this.CPP_CS_EVENT_EVENT, function (evt) {
      adapter.eventForwarder(evt);
    });
  }

  // If required, tell plug-in to register listener
  if (!alreadyListening)
    this.dispatchToEventAdapter(this.ADD_EVENT_LISTENER_EVENT, eventType);
};

/**
 * Called when an event is received from the plug-in. Extracts the data
 * sent from the plug-in, creates a corresponding event and
 * dispatches it to the client.
 */
EventAdapter.prototype.eventForwarder = function (event) {
  var appEvent = this.createAppEvent(event);
  var listeners = this.eventListening[appEvent.type];
  if (listeners) {
    for (var listener in listeners) listeners[listener].call(this, appEvent);
  }
};

/**
 * This method must be overridden by subclasses, or it will
 * throw an Error. It is called whenever a CS event is received from
 * the host adapter plug-in which requires translation.
 *
 * @param event The CS event to translate
 * @return The translated event to dispatch
 */
EventAdapter.prototype.createAppEvent = function (event) {
  throw new Error(
    "EventAdapter.createAppEvent(..) must be overridden by subclasses"
  );
};

/**
 * Removes an event listener for the specified event.
 *
 * If no matching listener is registered with this event adapter,
 * a call to this method has no effect.
 *
 * @param eventType The event type to remove the listener for
 * @param listener The listener object to remove
 *
 */
EventAdapter.prototype.removeEventListener = function (
  eventType,
  listener,
  useCapture
) {
  useCapture = useCapture === undefined ? false : useCapture;

  var wasListening = this.hasEventListener(eventType);

  if (!wasListening) return;

  var listeners = this.eventListening[eventType];
  var size = 0;

  if (listeners) {
    if (listeners && listeners[listener]) {
      delete listeners[listener];
    }

    if (listeners) {
      for (var key in listeners) {
        if (listeners.hasOwnProperty(key)) size++;
      }
    }
  }

  if (size == 0) {
    delete this.eventListening[eventType];
  }

  // If we were listening for the event before, but now we're
  // not, then tell the plug-in to stop listening for it
  if (wasListening && !this.hasEventListener(eventType))
    this.dispatchToEventAdapter(this.REMOVE_EVENT_LISTENER_EVENT, eventType);
};

/**
 * Obtains a list of the events for which the host adapter plug-in is
 * currently listening.
 *
 * A ListEventsEvent is dispatched to responseHandler when the list of
 * events is received from the host adapter plug-in.
 *
 * This method provides a means of checking whether an event listener was
 * successfully added or removed by the host adapter plug-in.
 *
 * @param responseHandler A listener function to which the resulting
 * ListEventsEvent will be dispatched
 */
EventAdapter.prototype.listEvents = function (responseHandler) {
  this.userListEventsResponseHandler = responseHandler;
  this.csInterface.addEventListener(
    this.LIST_EVENTS_RESPONSE_EVENT,
    listEventsResponseHandler
  );
  this.dispatchToEventAdapter(this.LIST_EVENTS_REQUEST_EVENT);
  var adapter = this;

  function listEventsResponseHandler(evt) {
    adapter.csInterface.removeEventListener(
      adapter.LIST_EVENTS_RESPONSE_EVENT,
      listEventsResponseHandler
    );

    // Extract events data from event XML payload
    var eventsArray = [];

    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(
      evt.data.replace("<![CDATA[", "").replace("]]>", ""),
      "text/xml"
    );
    var events = xmlDoc.firstChild.childNodes;
    for (var i = 0; i < events.length; i++) {
      eventsArray.push(events[i].getAttribute("id"));
    }

    var eventToDispatch = new ListEventsEvent(
      ListEventsEvent.LIST,
      eventsArray
    );
    adapter.userListEventsResponseHandler(eventToDispatch);
  }
};

/**
 * Dispatched when a ping response is received from a host adapter
 * plug-in, or when a ping request times out.
 *
 */
function PingEvent(type) {
  this.type = type;
}

/**
 * Defines the value of the type property of a ping_succeeded
 * event object.
 *
 */
PingEvent.PING_SUCCEEDED = "pingSucceeded";

/**
 * Defines the value of the type property of a ping_timed_out
 * event object.
 *
 */
PingEvent.PING_TIMED_OUT = "pingTimedOut";

/**
 * Dispatched when a "list events" response is received from a host
 * adapter plug-in.
 *
 * The list property of this event contains a list of the
 * events which the host adapter was listening for at the time of
 * event dispatch.
 *
 * Constructs a ListEventsEvent with the specified type and event list array.
 *
 * @param type	The ListEventsEvent type
 * @param list	The list of events the host adapter is listening for
 */
function ListEventsEvent(type, list) {
  this.type = type;
  this._list = list;
}

/**
 * Defines the value of the type property of a ping_succeeded
 * event object.
 *
 */
ListEventsEvent.LIST = "listEvents";

/**
 * The list of events being listened for by the host adapter plug-in
 * which triggered this event. Typically each item in the array is a
 * String representing an event's unique identifier, however this may
 * vary between host applications.
 *
 */
ListEventsEvent.prototype.list = function () {
  return this._list;
};

/**
 * Represents an event which occurred in Photoshop. Provides a set of event
 * types which may be listened for via PSEventAdapter.addEventListener(...).
 *
 * Constructs a new PSEvent with the specified type. The type should be a
 * String representation of the event's Photoshop runtime ID.
 *
 * @see PSEventAdapter
 */
/*function PSEvent(type)
{
	this.type = type;
}

PSEvent._3DTRANSFORM = "1415861280";
PSEvent.AVERAGE = "1098281575";
PSEvent.APPLY_STYLE = "1095988345";
PSEvent.ASSERT = "1098084980";
PSEvent.ACCENTED_EDGES = "1097032517";
PSEvent.ADD = "1097098272";
PSEvent.ADD_NOISE = "1097092723";
PSEvent.ADD_TO = "1097098324";
PSEvent.ALIGN = "1097623406";
PSEvent.ALL = "1097624608";
PSEvent.ANGLED_STROKES = "1097754451";
PSEvent.APPLY_IMAGE = "1097887817";
PSEvent.BAS_RELIEF = "1114853996";
PSEvent.BATCH = "1114923880";
PSEvent.BATCH_FROM_DROPLET = "1114923846";
PSEvent.BLUR = "1114403360";
PSEvent.BLUR_MORE = "1114403405";
PSEvent.BORDER = "1114793074";
PSEvent.BRIGHTNESS = "1114793795";
PSEvent.CANVAS_SIZE = "1131312723";
PSEvent.CHALK_CHARCOAL = "1130916931";
PSEvent.CHANNEL_MIXER = "1130917453";
PSEvent.CHARCOAL = "1130918499";
PSEvent.CHROME = "1130918509";
PSEvent.CLEAR = "1131177330";
PSEvent.CLOSE = "1131180832";
PSEvent.CLOUDS = "1131177075";
PSEvent.COLOR_BALANCE = "1131180610";
PSEvent.COLOR_HALFTONE = "1131180616";
PSEvent.COLOR_RANGE = "1131180626";
PSEvent.COLORED_PENCIL = "1131180624";
PSEvent.CONTE_CRAYON = "1131312195";
PSEvent.CONTRACT = "1131312227";
PSEvent.CONVERT_MODE = "1131312717";
PSEvent.COPY = "1668247673";
PSEvent.COPY_EFFECTS = "1131431512";
PSEvent.COPY_MERGED = "1131444557";
PSEvent.COPY_TO_LAYER = "1131435084";
PSEvent.CRAQUELURE = "1131573612";
PSEvent.CREATE_DROPLET = "1131574340";
PSEvent.CROP = "1131573104";
PSEvent.CROSSHATCH = "1131574120";
PSEvent.CRYSTALLIZE = "1131574132";
PSEvent.CURVES = "1131574899";
PSEvent.CUSTOM = "1131639917";
PSEvent.CUT = "1668641824";
PSEvent.CUT_TO_LAYER = "1131697228";
PSEvent.CUTOUT = "1131683872";
PSEvent.DARK_STROKES = "1148349267";
PSEvent.DE_INTERLACE = "1148089458";
PSEvent.DEFINE_PATTERN = "1147563600";
PSEvent.DEFRINGE = "1147564647";
PSEvent.DELETE = "1147958304";
PSEvent.DESATURATE = "1148417140";
PSEvent.DESELECT = "1148415075";
PSEvent.DESPECKLE = "1148416099";
PSEvent.DIFFERENCE_CLOUDS = "1147564611";
PSEvent.DIFFUSE = "1147564832";
PSEvent.DIFFUSE_GLOW = "1147564871";
PSEvent.DISABLE_LAYER_FX = "1684825720";
PSEvent.DISPLACE = "1148416108";
PSEvent.DISTRIBUTE = "1148417138";
PSEvent.DRAW = "1148346743";
PSEvent.DRY_BRUSH = "1148352834";
PSEvent.DUPLICATE = "1148218467";
PSEvent.DUST_AND_SCRATCHES = "1148417107";
PSEvent.EMBOSS = "1164796531";
PSEvent.EQUALIZE = "1165061242";
PSEvent.EXCHANGE = "1165517672";
PSEvent.EXPAND = "1165521006";
PSEvent.EXPORT = "1165521010";
PSEvent.EXTRUDE = "1165522034";
PSEvent.FACET = "1180922912";
PSEvent.FADE = "1180787813";
PSEvent.FEATHER = "1182034034";
PSEvent.FIBERS = "1180856947";
PSEvent.FILL = "1181491232";
PSEvent.FILM_GRAIN = "1181510983";
PSEvent.FILTER = "1181512818";
PSEvent.FIND_EDGES = "1181639749";
PSEvent.FLATTEN_IMAGE = "1181512777";
PSEvent.FLIP = "1181510000";
PSEvent.FRAGMENT = "1181902701";
PSEvent.FRESCO = "1181905763";
PSEvent.GAUSSIAN_BLUR = "1198747202";
PSEvent.GET = "1734702180";
PSEvent.GLASS = "1198289696";
PSEvent.GLOWING_EDGES = "1198290757";
PSEvent.GRADIENT = "1198679150";
PSEvent.GRADIENT_MAP = "1198673264";
PSEvent.GRAIN = "1198681632";
PSEvent.GRAPHIC_PEN = "1198678352";
PSEvent.GROUP = "1198682188";
PSEvent.GROW = "1198681975";
PSEvent.HALFTONE_SCREEN = "1215063635";
PSEvent.HIDE = "1214521376";
PSEvent.HIGH_PASS = "1214736464";
PSEvent.HSBHSL = "1215521360";
PSEvent.HUE_SATURATION = "1213428850";
PSEvent.IMAGE_SIZE = "1231906643";
PSEvent.IMPORT = "1231908978";
PSEvent.INK_OUTLINES = "1231973199";
PSEvent.INTERSECT = "1231975538";
PSEvent.INTERSECT_WITH = "1231975511";
PSEvent.INVERSE = "1231976051";
PSEvent.INVERT = "1231976050";
PSEvent.LENS_FLARE = "1282306886";
PSEvent.LEVELS = "1282829427";
PSEvent.LIGHTING_EFFECTS = "1281845317";
PSEvent.LINK = "1282304800";
PSEvent.MAKE = "1298866208";
PSEvent.MAXIMUM = "1299737888";
PSEvent.MEDIAN = "1298427424";
PSEvent.MERGE_LAYERS = "1299343154";
PSEvent.MERGE_LAYERS_OLD = "1299343180";
PSEvent.MERGE_SPOT_CHANNEL = "1297313908";
PSEvent.MERGE_VISIBLE = "1299343190";
PSEvent.MEZZOTINT = "1299870830";
PSEvent.MINIMUM = "1299082528";
PSEvent.MOSAIC = "1299407648";
PSEvent.MOSAIC_PLUGIN = "1299407700";
PSEvent.MOTION_BLUR = "1299476034";
PSEvent.MOVE = "1836021349";
PSEvent.NTSCCOLORS = "1314149187";
PSEvent.NEON_GLOW = "1313303671";
PSEvent.NEXT = "1316516896";
PSEvent.NOTE_PAPER = "1316245618";
PSEvent.NOTIFY = "1316251257";
PSEvent.OCEAN_RIPPLE = "1331916370";
PSEvent.OFFSET = "1332114292";
PSEvent.OPEN = "1332768288";
PSEvent.PAINT = "1349415968";
PSEvent.PAINT_DAUBS = "1349416004";
PSEvent.PALETTE_KNIFE = "1349284939";
PSEvent.PASTE = "1885434740";
PSEvent.PASTE_EFFECTS = "1348552280";
PSEvent.PASTE_INTO = "1349743689";
PSEvent.PASTE_OUTSIDE = "1349743695";
PSEvent.PATCHWORK = "1349804904";
PSEvent.PHOTOCOPY = "1349022819";
PSEvent.PINCH = "1349411688";
PSEvent.PLACE = "1349280544";
PSEvent.PLASTER = "1349284724";
PSEvent.PLASTIC_WRAP = "1349284695";
PSEvent.PLAY = "1349286176";
PSEvent.POINTILLIZE = "1349416044";
PSEvent.POLAR = "1349284384";
PSEvent.POSTER_EDGES = "1349743685";
PSEvent.POSTERIZE = "1349743730";
PSEvent.PREVIOUS = "1349678707";
PSEvent.PRINT = "1349676660";
PSEvent.PROFILE_TO_PROFILE = "1349674580";
PSEvent.PURGE = "1349674853";
PSEvent.QUIT = "1903520116";
PSEvent.RADIAL_BLUR = "1382313026";
PSEvent.RASTERIZE = "1383298162";
PSEvent.RASTERIZE_TYPE_SHEET = "1383298132";
PSEvent.REMOVE_BLACK_MATTE = "1382905410";
PSEvent.REMOVE_LAYER_MASK = "1382905420";
PSEvent.REMOVE_WHITE_MATTE = "1382905431";
PSEvent.RENAME = "1382968608";
PSEvent.REPLACE_COLOR = "1383099459";
PSEvent.RESET = "1383294324";
PSEvent.RETICULATION = "1383359340";
PSEvent.REVERT = "1383494260";
PSEvent.RIPPLE = "1383099493";
PSEvent.ROTATE = "1383363685";
PSEvent.ROUGH_PASTELS = "1382508624";
PSEvent.SAVE = "1935767141";
PSEvent.SELECT = "1936483188";
PSEvent.SELECTIVE_COLOR = "1399612227";
PSEvent.SET = "1936028772";
PSEvent.SHARPEN_EDGES = "1399353925";
PSEvent.SHARPEN = "1399353968";
PSEvent.SHARPEN_MORE = "1399353933";
PSEvent.SHEAR = "1399353888";
PSEvent.SHOW = "1399355168";
PSEvent.SIMILAR = "1399680114";
PSEvent.SMART_BLUR = "1399681602";
PSEvent.SMOOTH = "1399682152";
PSEvent.SMUDGE_STICK = "1399678035";
PSEvent.SOLARIZE = "1399616122";
PSEvent.SPATTER = "1399878688";
PSEvent.SPHERIZE = "1399875698";
PSEvent.SPLIT_CHANNELS = "1399876675";
PSEvent.SPONGE = "1399877223";
PSEvent.SPRAYED_STROKES = "1399878227";
PSEvent.STAINED_GLASS = "1400139335";
PSEvent.STAMP = "1400139120";
PSEvent.STOP = "1400139632";
PSEvent.STROKE = "1400140395";
PSEvent.SUBTRACT = "1398961266";
PSEvent.SUBTRACT_FROM = "1398961222";
PSEvent.SUMIE = "1399679333";
PSEvent.TAKE_MERGED_SNAPSHOT = "1416318322";
PSEvent.TAKE_SNAPSHOT = "1416319854";
PSEvent.TEXTURE_FILL = "1417180230";
PSEvent.TEXTURIZER = "1417180282";
PSEvent.THRESHOLD = "1416131187";
PSEvent.TILES = "1416393504";
PSEvent.TORN_EDGES = "1416785477";
PSEvent.TRACE_CONTOUR = "1416782659";
PSEvent.TRANSFORM = "1416785510";
PSEvent.TRAP = "1416782192";
PSEvent.TWIRL = "1417114220";
PSEvent.UNDERPAINTING = "1433298034";
PSEvent.UNDO = "1970168943";
PSEvent.UNGROUP = "1433298802";
PSEvent.UNLINK = "1433300075";
PSEvent.UNSHARP_MASK = "1433301837";
PSEvent.VARIATIONS = "1450341486";
PSEvent.WAIT = "1466001780";
PSEvent.WATER_PAPER = "1467249232";
PSEvent.WATERCOLOR = "1467249251";
PSEvent.WAVE = "1466005093";
PSEvent.WIND = "1466852384";
PSEvent.ZIG_ZAG = "1516722791";
PSEvent.BACK_LIGHT = "1113678668";
PSEvent.FILL_FLASH = "1181314117";
PSEvent.COLOR_CAST = "1131375685";
PSEvent.OPEN_UNTITLED = "1332768341";

PSEvent.events = {
"1095988345":"APPLY_STYLE",
"1097032517":"ACCENTED_EDGES",
"1097092723":"ADD_NOISE",
"1097098272":"ADD",
"1097098324":"ADD_TO",
"1097623406":"ALIGN",
"1097624608":"ALL",
"1097754451":"ANGLED_STROKES",
"1097887817":"APPLY_IMAGE",
"1098084980":"ASSERT",
"1098281575":"AVERAGE",
"1113678668":"BACK_LIGHT",
"1114403360":"BLUR",
"1114403405":"BLUR_MORE",
"1114793074":"BORDER",
"1114793795":"BRIGHTNESS",
"1114853996":"BAS_RELIEF",
"1114923846":"BATCH_FROM_DROPLET",
"1114923880":"BATCH",
"1130916931":"CHALK_CHARCOAL",
"1130917453":"CHANNEL_MIXER",
"1130918499":"CHARCOAL",
"1130918509":"CHROME",
"1131177075":"CLOUDS",
"1131177330":"CLEAR",
"1131180610":"COLOR_BALANCE",
"1131180616":"COLOR_HALFTONE",
"1131180624":"COLORED_PENCIL",
"1131180626":"COLOR_RANGE",
"1131180832":"CLOSE",
"1131312195":"CONTE_CRAYON",
"1131312227":"CONTRACT",
"1131312717":"CONVERT_MODE",
"1131312723":"CANVAS_SIZE",
"1131375685":"COLOR_CAST",
"1131431512":"COPY_EFFECTS",
"1131435084":"COPY_TO_LAYER",
"1131444557":"COPY_MERGED",
"1131573104":"CROP",
"1131573612":"CRAQUELURE",
"1131574120":"CROSSHATCH",
"1131574132":"CRYSTALLIZE",
"1131574340":"CREATE_DROPLET",
"1131574899":"CURVES",
"1131639917":"CUSTOM",
"1131683872":"CUTOUT",
"1131697228":"CUT_TO_LAYER",
"1147563600":"DEFINE_PATTERN",
"1147564611":"DIFFERENCE_CLOUDS",
"1147564647":"DEFRINGE",
"1147564832":"DIFFUSE",
"1147564871":"DIFFUSE_GLOW",
"1147958304":"DELETE",
"1148089458":"DE_INTERLACE",
"1148218467":"DUPLICATE",
"1148346743":"DRAW",
"1148349267":"DARK_STROKES",
"1148352834":"DRY_BRUSH",
"1148415075":"DESELECT",
"1148416099":"DESPECKLE",
"1148416108":"DISPLACE",
"1148417107":"DUST_AND_SCRATCHES",
"1148417138":"DISTRIBUTE",
"1148417140":"DESATURATE",
"1164796531":"EMBOSS",
"1165061242":"EQUALIZE",
"1165517672":"EXCHANGE",
"1165521006":"EXPAND",
"1165521010":"EXPORT",
"1165522034":"EXTRUDE",
"1180787813":"FADE",
"1180856947":"FIBERS",
"1180922912":"FACET",
"1181314117":"FILL_FLASH",
"1181491232":"FILL",
"1181510000":"FLIP",
"1181510983":"FILM_GRAIN",
"1181512777":"FLATTEN_IMAGE",
"1181512818":"FILTER",
"1181639749":"FIND_EDGES",
"1181902701":"FRAGMENT",
"1181905763":"FRESCO",
"1182034034":"FEATHER",
"1198289696":"GLASS",
"1198290757":"GLOWING_EDGES",
"1198673264":"GRADIENT_MAP",
"1198678352":"GRAPHIC_PEN",
"1198679150":"GRADIENT",
"1198681632":"GRAIN",
"1198681975":"GROW",
"1198682188":"GROUP",
"1198747202":"GAUSSIAN_BLUR",
"1213428850":"HUE_SATURATION",
"1214521376":"HIDE",
"1214736464":"HIGH_PASS",
"1215063635":"HALFTONE_SCREEN",
"1215521360":"HSBHSL",
"1231906643":"IMAGE_SIZE",
"1231908978":"IMPORT",
"1231973199":"INK_OUTLINES",
"1231975511":"INTERSECT_WITH",
"1231975538":"INTERSECT",
"1231976050":"INVERT",
"1231976051":"INVERSE",
"1281845317":"LIGHTING_EFFECTS",
"1282304800":"LINK",
"1282306886":"LENS_FLARE",
"1282829427":"LEVELS",
"1297313908":"MERGE_SPOT_CHANNEL",
"1298427424":"MEDIAN",
"1298866208":"MAKE",
"1299082528":"MINIMUM",
"1299343154":"MERGE_LAYERS",
"1299343180":"MERGE_LAYERS_OLD",
"1299343190":"MERGE_VISIBLE",
"1299407648":"MOSAIC",
"1299407700":"MOSAIC_PLUGIN",
"1299476034":"MOTION_BLUR",
"1299737888":"MAXIMUM",
"1299870830":"MEZZOTINT",
"1313303671":"NEON_GLOW",
"1314149187":"NTSCCOLORS",
"1316245618":"NOTE_PAPER",
"1316251257":"NOTIFY",
"1316516896":"NEXT",
"1331916370":"OCEAN_RIPPLE",
"1332114292":"OFFSET",
"1332768288":"OPEN",
"1332768341":"OPEN_UNTITLED",
"1348552280":"PASTE_EFFECTS",
"1349022819":"PHOTOCOPY",
"1349280544":"PLACE",
"1349284384":"POLAR",
"1349284695":"PLASTIC_WRAP",
"1349284724":"PLASTER",
"1349284939":"PALETTE_KNIFE",
"1349286176":"PLAY",
"1349411688":"PINCH",
"1349415968":"PAINT",
"1349416004":"PAINT_DAUBS",
"1349416044":"POINTILLIZE",
"1349674580":"PROFILE_TO_PROFILE",
"1349674853":"PURGE",
"1349676660":"PRINT",
"1349678707":"PREVIOUS",
"1349743685":"POSTER_EDGES",
"1349743689":"PASTE_INTO",
"1349743695":"PASTE_OUTSIDE",
"1349743730":"POSTERIZE",
"1349804904":"PATCHWORK",
"1382313026":"RADIAL_BLUR",
"1382508624":"ROUGH_PASTELS",
"1382905410":"REMOVE_BLACK_MATTE",
"1382905420":"REMOVE_LAYER_MASK",
"1382905431":"REMOVE_WHITE_MATTE",
"1382968608":"RENAME",
"1383099459":"REPLACE_COLOR",
"1383099493":"RIPPLE",
"1383294324":"RESET",
"1383298132":"RASTERIZE_TYPE_SHEET",
"1383298162":"RASTERIZE",
"1383359340":"RETICULATION",
"1383363685":"ROTATE",
"1383494260":"REVERT",
"1398961222":"SUBTRACT_FROM",
"1398961266":"SUBTRACT",
"1399353888":"SHEAR",
"1399353925":"SHARPEN_EDGES",
"1399353933":"SHARPEN_MORE",
"1399353968":"SHARPEN",
"1399355168":"SHOW",
"1399612227":"SELECTIVE_COLOR",
"1399616122":"SOLARIZE",
"1399678035":"SMUDGE_STICK",
"1399679333":"SUMIE",
"1399680114":"SIMILAR",
"1399681602":"SMART_BLUR",
"1399682152":"SMOOTH",
"1399875698":"SPHERIZE",
"1399876675":"SPLIT_CHANNELS",
"1399877223":"SPONGE",
"1399878227":"SPRAYED_STROKES",
"1399878688":"SPATTER",
"1400139120":"STAMP",
"1400139335":"STAINED_GLASS",
"1400139632":"STOP",
"1400140395":"STROKE",
"1415861280":"_3DTRANSFORM",
"1416131187":"THRESHOLD",
"1416318322":"TAKE_MERGED_SNAPSHOT",
"1416319854":"TAKE_SNAPSHOT",
"1416393504":"TILES",
"1416782192":"TRAP",
"1416782659":"TRACE_CONTOUR",
"1416785477":"TORN_EDGES",
"1416785510":"TRANSFORM",
"1417114220":"TWIRL",
"1417180230":"TEXTURE_FILL",
"1417180282":"TEXTURIZER",
"1433298034":"UNDERPAINTING",
"1433298802":"UNGROUP",
"1433300075":"UNLINK",
"1433301837":"UNSHARP_MASK",
"1450341486":"VARIATIONS",
"1466001780":"WAIT",
"1466005093":"WAVE",
"1466852384":"WIND",
"1467249232":"WATER_PAPER",
"1467249251":"WATERCOLOR",
"1516722791":"ZIG_ZAG",
"1668247673":"COPY",
"1668641824":"CUT",
"1684825720":"DISABLE_LAYER_FX",
"1734702180":"GET",
"1836021349":"MOVE",
"1885434740":"PASTE",
"1903520116":"QUIT",
"1935767141":"SAVE",
"1936028772":"SET",
"1936483188":"SELECT",
"1970168943":"UNDO"
};

/**
 * PSEventAdapter provides APIs for registering and unregistering event 
 * listeners for Photoshop events. It requires the PSHostAdapter Photoshop 
 * plugin to be installed in the host application in order for its method
 * calls to have any effect.
 * 
 * Use the addEventListener and removeEventListener
 * methods to add and remove event listeners for Photoshop events. Specify
 * the unique code for a Photoshop event to the addEventListener
 * function to start listening for it.
 * 
 * Photoshop events are identified either by a "char ID" or a "string ID".
 * Char IDs statically map to a particular event code. String IDs map 
 * dynamically to a code which varies across Photoshop runtimes.
 * 
 * Listening for events defined by Char IDs
 * 
 * The PSEvent class provides a set of constants representing
 * the codes for events defined by char IDs. For example, to listen for the 
 * opening of a document in Photoshop, use:
 * 
 * PSEventAdapter.getInstance().addEventListener(PSEvent.OPEN, listener);
 * 
 * where listener is a method with the following signature:
 * 
 * function listener(event:PSEvent)
 * 
 * When a document is opened in Photoshop, a PSEvent 
 * instance with type PSEvent.OPEN will be dispatched.
 * 
 * Listening for events defined by String IDs
 * 
 * To listen for an event with a String ID, firstly obtain the event's
 * runtime code. This is possible using the app.stringIDToTypeID
 * method provided in the JavaScript scripting interface. For example: 
 * 
 * var code = app.stringIDToTypeID("some_event_name");
 * 
 * Then convert the code to a String and call 
 * addEventListener
 * 
 * PSEventAdapter.getInstance().addEventListener(code, listener);
 * 
 * Determining which events corresponds to which user interactions
 * 
 * To determine which events correspond to which user interactions, it is 
 * recommended to use the Photoshop ScriptListener plug-in. See the 
 * Product-specific guide for Photoshop provided with ExtensionBuilder for 
 * details on how to use the ScriptListener plug-in.
 *  
 */

/*function PSEventAdapter()
{
	EventAdapter.call(this, PSEventAdapter.NAMESPACE);	
}*/

/**
 * <p>Returns the PSEventAdapter instance.</p>
 *
 * @return the PSEventAdapter instance
 */

/*PSEventAdapter.getInstance = function() {
	if (PSEventAdapter.instance == null)
		PSEventAdapter.instance = new PSEventAdapter();
	return PSEventAdapter.instance;
};

PSEventAdapter.NAMESPACE = "com.adobe.photoshop.events";

extendObj(PSEventAdapter, EventAdapter);

PSEventAdapter.prototype.createAppEvent = function(event) {
    var parser = new DOMParser();
    var xmlDoc  = parser.parseFromString(event.data.replace("<![CDATA[", "").replace("]]>", ""), "text/xml");
	var eventId = xmlDoc.firstChild.getAttribute("id");
    return new PSEvent(eventId);
};*/

function extendObj(childObj, parentObj) {
  var tmpObj = new Function();
  tmpObj.prototype = parentObj.prototype;
  childObj.prototype = new tmpObj();
  childObj.prototype.constructor = childObj;
}

/*Illustrator Event Adapter
 */
function AIEvent(type) {
  this.type = type;
}

function AIEventAdapter() {
  EventAdapter.call(this, AIEventAdapter.NAMESPACE);
}

/**
 * <p>Returns the AIEventAdapter instance.</p>
 *
 * @return the AIEventAdapter instance
 */

AIEventAdapter.getInstance = function () {
  if (AIEventAdapter.instance == null)
    AIEventAdapter.instance = new AIEventAdapter();
  return AIEventAdapter.instance;
};

AIEventAdapter.NAMESPACE = "com.adobe.illustrator.events";

extendObj(AIEventAdapter, EventAdapter);

AIEventAdapter.prototype.createAppEvent = function (event) {
  var parser = new DOMParser();
  var xmlDoc = parser.parseFromString(
    event.data.replace("<![CDATA[", "").replace("]]>", ""),
    "text/xml"
  );
  var eventId = xmlDoc.firstChild.getAttribute("id");
  return new AIEvent(eventId);
};

/**
 *  Sent when an action event has completed execution.
 */

AIEvent.ACTION_MANAGER_PLAY_ACTION_EVENT_DONE =
  "AI Action Manager PlayActionEvent Done Notifier";
AIEvent.ACTION_ACTUAL_EXECUTION_FINISHED =
  "AI Action Actual Execution Finished Notifier";

/**
 *  Sent when either a change in the selected art objects occurs or an artwork modification such as moving a point on a path occurs. You cannot distinguish a selection change from an artwork modification change. There is no notifier than means just one or the other. Receiving this does not necessarily mean that the set of selected objects, as returned AIMatchingArtSuite::GetSelectedArt(), is different.
 */

AIEvent.ART_SELECTION_CHANGED = "AI Art Selection Changed Notifier";

/**
 *  Sent when drawing mode of a document changes
 */

AIEvent.DRAWING_MODE_CHANGED = "AI Drawing Mode Changed Notifier";

/**
 *  Sent when an object attribute such as the fill or stroke of an object changes. Same as kAIArtSelectionChangedNotifier, except that it is additionally sent if any global object sets change.
 */

AIEvent.ART_PROPERTIES_CHANGED = "AI Art Properties Changed Notifier";

/**
 *  Sent when the key object or the key anchor point to be aligned to changes. This happens when there is any change in the key art; that is, a reset to NULL, a change from NULL to a valid art object, or a change from one object or anchor point to another.
 */

AIEvent.ALIGNMENT_KEY_ART_CHANGED = "AI Alignment Key Art Changed Notifier";

/**
 *  Sent when the list of styles in the Graphic Styles palette changes in any way, such as the order of the list, the names of the styles, deletions, additions, and so on. Also sent when such changes are undone or redone.
 */

AIEvent.NAMED_STYLE_LIST_CHANGED = "AI Named Style List Changed Notifier";

/**
 *  Sent when the focus changes from the entire object to just the fill or stroke of the object, or the reverse. The notify data includes the current focus as an AIArtStyleFocusValue. The current focus controls whether transparency and Live Effects applied by the user affect the targeted object as a whole or just the fill or stroke of the targeted object.
 */

AIEvent.ART_STYLE_FOCUS_CHANGED = "AI Art Style Focus Changed Notifier";

/**
 *  Sent by the Appearance palette when the user double-clicks a transparency entry. Used mainly to bring up the transparency palette.
 */

AIEvent.ART_STYLE_EDIT_TRANSPARENCY = "AI Edit Transparency Notifier";

/**
 *
 */

AIEvent.LAUNCH_PROJECT_BRIDGE = "AI Launch Project Bridge Notifier";

/**
 *  Font changed in current document. See AIATETextUtilSuite
 */

AIEvent.CURRENT_FONT_CHANGED = "AI Current Font Changed Notifier";

/**
 *  Font size changed in current document. See AIATETextUtilSuite
 */

AIEvent.CURRENT_FONT_SIZE_CHANGED = "AI Current Font Size Changed Notifier";

/**
 *  List of available fonts changed. See AIATETextUtilSuite
 */

AIEvent.FONT_LIST_CHANGED = "AI Font List Changed Notifier";

/**
 *  Sent whenever the color management settings for are changed.
 */

AIEvent.COLOR_CALIBRATION_CHANGED = "AI Color Calibration Changed Notifier";

/**
 *  Sent after CSXS PlugPlug setup completion.
 */

AIEvent.CSXS_PLUG_PLUG_SETUP_COMPLETE = "AI CSXS PlugPlug Setup Complete";
AIEvent.CSXS_EXTENSION_UNLOAD = "Extension Unloaded Notifier";

/**
 *  Sent when there is a change to custom colors, including adding a new color or deleting an existing one. No is data sent with the notifier, so the plug-in must determine what change occurred using the AICustomColorSuite functions.
 */

AIEvent.ART_CUSTOM_COLOR_CHANGED = "AI Art Custom Color Changed Notifier";

/**
 *  Sent when the contents of a document have changed.
 */

AIEvent.DOCUMENT_CHANGED = "AI Document Changed Notifier";

/**
 *  Sent right before the last document window of the artwork is about to be closed.
 */

AIEvent.DOCUMENT_ABOUT_TO_CLOSE = "AI Document About To Close Notifier";

/**
 *  Sent when a document has been closed.
 */

AIEvent.DOCUMENT_CLOSED = "AI Document Closed Notifier";

/**
 *  Sent when a document has been opened.
 */

AIEvent.DOCUMENT_OPENED = "AI Document Opened Notifier";

/**
 *  Sent when a document has been saved.
 */

AIEvent.DOCUMENT_SAVED = "AI Document Saved Notifier";

/**
 *  Sent when a new document has been created.
 */

AIEvent.DOCUMENT_NEW = "AI Document New Notifier";

/**
 *  Sent when the color model for a document has changed.
 */

AIEvent.DOCUMENT_CLR_MDL_CHANGED = "AI Document Color Model Changed Notifier";

/**
 *  Sent when document profiles have been changed.
 */

AIEvent.DOCUMENT_PROFILES_CHANGED = "AI Document Profiles Changed Notifier";

/**
 *  Sent whenever the spot color mode of a document has been changed. The document is not necessarily an open document being edited by a user. For example, swatch libraries are considered documents.
 */

AIEvent.DOCUMENT_SPOT_COLOR_MODE_CHANGED =
  "AI Document Spot Color Mode Changed Notifier";

/**
 *  Sent when ruler unit has changed.
 */

AIEvent.DOCUMENT_RULER_UNIT_CHANGED = "AI Document Ruler Unit Changed Notifier";

/**
 *  Sent just before the document is saved, along with the AI Version information to allow any data conversion required for saving to legacy files. For example, Unicode data must be converted to Platform encoding before saving to AI versions less than version 12.
 */

AIEvent.DOCUMENT_WRITE_PREPROCESS = "AI Document Write Preprocess Notifier";

/**
 *  Sent just after serializing a document to an Illustrator file format, and before the flattening layer is removed (if the document was flattened). Allows plug-ins to clean up anything that was done during preprocessing.
 */

AIEvent.DOCUMENT_WRITE_POSTPROCESS = "AI Document Write Postprocess Notifier";

/**
 *  Sent when a crop area has been modified, deleted, or created.
 */

AIEvent.DOCUMENT_CROP_AREA_MODIFIED = "AI Document Crop Area Modified Notifier";

/**
 *  Sent when the document ruler origin has been changed or reset. See AIDocumentSuite.
 */

AIEvent.DOCUMENT_RULER_ORIGIN_CHANGED =
  "AI Document Ruler Origin Changed Notifier";

/**
 *  Sent when the document bleed values have been changed. See AIDocumentSuite.
 */

AIEvent.DOCUMENT_BLEEDS_CHANGED = "AI Document Bleed Value Changed Notifier";

/**
 *  Sent when the transparency grid is toggled.
 */

AIEvent.DOCUMENT_TRANSPARENCY_GRID = "AI Document Transparency Grid Notifier";

/**
 *  Sent when the document view changes. See AIDocumentViewSuite.
 */

AIEvent.DOCUMENT_VIEW_CHANGED = "AI Document View Changed Notifier";

/**
 *  See AIDocumentViewSuite::GetDocumentViewInvalidRect()
 */

AIEvent.DOCUMENT_VIEW_INVALID_RECT_CHANGED =
  "AI Document View Invalid Rect Changed Notifier";

/**
 *  Sent when the document view style changes. See AIDocumentViewSuite.
 */

AIEvent.DOCUMENT_VIEW_STYLE_CHANGED = "AI Document View Style Changed Notifier";

/**
 *  Sent when the active view switches from one view window to another. See AIDocumentViewSuite.
 */

AIEvent.DOCUMENT_VIEW_ACTIVE_VIEW_CHANGED =
  "AI Document View Style Active View Changed Notifier";

/**
 *  Sent when the active view's plate set's state changes. See AIDocumentViewSuite.
 */

AIEvent.DOCUMENT_VIEW_OPP_PLATE_STATE_CHANGED =
  "AI Document View Plate State Changed Notifier";

/**
 *  Sent when the edges visibility on the document is toggled.
 */

AIEvent.DOCUMENT_VIEW_EDGES_VISIBILITY_CHANGE =
  "AI Document View Edges Visibility Change Notifier";

/**
 *  Sent when title of the active document view is changed.
 */

AIEvent.ACTIVE_DOC_VIEW_TITLE_CHANGED =
  "AI Document View Title Changed Notifier";

/**
 *  If a notifier plug-in requests this type of notification, it receives this selector when any open-file action has been completed. See the AINotifierSuite.
 */

AIEvent.FILE_FORMAT_DOCUMENT_OPENED = "AI File Format Document Opened Notifier";

/**
 *  If a notifier plug-in requests this type of notification, it receives this selector when Illustrator cannot find a linked file for the current document. The notification data sent is of type AILinkUpdateNotifyData.
 */

AIEvent.FILE_FORMAT_LINK_UPDATE = "AI File Format Link Update Notifier";

/**
 *  Sent before a font import operation is executed. See AIFontSuite.
 */

AIEvent.BEGIN_IMPORT_COMP_FONT = "AI Begin Import CompFont Notifier";

/**
 *  Sent after a font import operation is executed. See AIFontSuite.
 */

AIEvent.END_IMPORT_COMP_FONT = "AI End Import CompFont Notifier";

/**
 *  Sent when the system language has changed. See AIMEFontSuite.
 */

AIEvent.CURRENT_LANGUAGE_CHANGED = "AI Current Language Changed Notifier";

/**
 *  Sent when a gradient (blend) has changed. See AIGradientSuite.
 */

AIEvent.ART_GRADIENT_CHANGED = "AI Art Gradient Changed Notifier";

/**
 *  Sent when the ruler coordinate system for current view has changed.
 */

AIEvent.CURRENT_COORDINATE_SYSTEM_CHANGED =
  "AI Current Coordinate System Changed Notifier";

/**
 *  (Internal, do not use) Sent after isolation-mode focus changes from one art object to another. See AIIsolationModeSuite Not sent when changes are a result of Undo or Redo actions.
 */

AIEvent.ISOLATION_MODE_CHANGED = "AI Isolation Mode Changed Notifier";

/**
 *  (Internal, do not use) Sent just before isolation-mode focus changes from one art object to another. See AIIsolationModeSuite Not sent when changes are a result of Undo or Redo actions.
 */

AIEvent.BEFORE_ISOLATION_MODE_CHANGED =
  "AI Before Isolation Mode Changed Notifier";

/**
 *  Sent when a new layer becomes current, but there are no changes to the layers themselves (options, names, ordering, and so on.)
 */

AIEvent.CURRENT_LAYER = "AI Current Layer Notifier";

/**
 *  Sent when layers are deleted. kAILayerSetNotifier is sent at the same time. Subscribe to this one if you care ONLY about deletions, but NOT new layers or reorderings; for example, to remove references to deleted layers,
 */

AIEvent.LAYER_DELETION = "AI Layer Deletion Notifier";

/**
 *  Sent when layers are added, deleted, or reordered. Respond, for example, by rebuilding the list for a layer palette.
 */

AIEvent.LAYER_SET = "AI Layer Set Notifier";

/**
 *  Sent when layers have changed options, such as name, selection color, lock status, visibility, view mode, and so on.)
 */

AIEvent.LAYER_OPTIONS = "AI Layer Options Notifier";

/**
 *  Sent when a layer list is pushed or popped. See AILayerListSuite.
 */

AIEvent.LAYER_LIST_CHANGED = "AI Edit Layer List Changed Notifier";

/**
 *  Sent when a menu item is modified using AIMenuSuite functions. Receives no associated data.
 */

AIEvent.MENU_CHANGED = "AI Menu Changed Notifier";
AIEvent.NEW_COMMAND_PRE = "AI Command Notifier: Before New";
AIEvent.NEW_COMMAND_POST = "AI Command Notifier: After New";
AIEvent.NEW_FROM_TEMPLATE_COMMAND_PRE =
  "AI Command Notifier: Before New From Template";
AIEvent.NEW_FROM_TEMPLATE_COMMAND_POST =
  "AI Command Notifier: After New From Template";
AIEvent.OPEN_COMMAND_PRE = "AI Command Notifier: Before Open";
AIEvent.OPEN_COMMAND_POST = "AI Command Notifier: After Open";
AIEvent.CLOSE_COMMAND_PRE = "AI Command Notifier: Before Close";
AIEvent.CLOSE_COMMAND_POST = "AI Command Notifier: After Close";
AIEvent.SAVE_COMMAND_PRE = "AI Command Notifier: Before Save";
AIEvent.SAVE_COMMAND_POST = "AI Command Notifier: After Save";
AIEvent.SAVE_AS_COMMAND_PRE = "AI Command Notifier: Before Save As";
AIEvent.SAVE_AS_COMMAND_POST = "AI Command Notifier: After Save As";
AIEvent.SAVE_A_COPY_AS_COMMAND_PRE =
  "AI Command Notifier: Before Save A Copy As";
AIEvent.SAVE_A_COPY_AS_COMMAND_POST =
  "AI Command Notifier: After Save A Copy As";
AIEvent.SAVE_AS_TEMPLATE_COMMAND_PRE =
  "AI Command Notifier: Before Save As Template";
AIEvent.SAVE_AS_TEMPLATE_COMMAND_POST =
  "AI Command Notifier: After Save As Template";
AIEvent.ADOBE_AI_SAVE_FOR_WEB_COMMAND_PRE =
  "AI Command Notifier: Before Adobe AI Save For Web";
AIEvent.ADOBE_AI_SAVE_FOR_WEB_COMMAND_POST =
  "AI Command Notifier: After Adobe AI Save For Web";
AIEvent.ADOBE_AI_SAVE_SELECTED_SLICES_COMMAND_PRE =
  "AI Command Notifier: Before Adobe AI Save Selected Slices";
AIEvent.ADOBE_AI_SAVE_SELECTED_SLICES_COMMAND_POST =
  "AI Command Notifier: After Adobe AI Save Selected Slices";
AIEvent.REVERT_TO_SAVED_COMMAND_PRE =
  "AI Command Notifier: Before Revert To Saved";
AIEvent.REVERT_TO_SAVED_COMMAND_POST =
  "AI Command Notifier: After Revert To Saved";
AIEvent.AI_PLACE_COMMAND_PRE = "AI Command Notifier: Before AI Place";
AIEvent.AI_PLACE_COMMAND_POST = "AI Command Notifier: After AI Place";
AIEvent.SAVE_FOR_OFFICE_COMMAND_PRE =
  "AI Command Notifier: Before Save for Office";
AIEvent.SAVE_FOR_OFFICE_COMMAND_POST =
  "AI Command Notifier: After Save for Office";
AIEvent.EXPORT_COMMAND_PRE = "AI Command Notifier: Before Export";
AIEvent.EXPORT_COMMAND_POST = "AI Command Notifier: After Export";
AIEvent.AI_BROWSE_FOR_SCRIPT_COMMAND_PRE =
  "AI Command Notifier: Before ai_browse_for_script";
AIEvent.AI_BROWSE_FOR_SCRIPT_COMMAND_POST =
  "AI Command Notifier: After ai_browse_for_script";
AIEvent.ART_SETUP_COMMAND_PRE = "AI Command Notifier: Before Art Setup";
AIEvent.ART_SETUP_COMMAND_POST = "AI Command Notifier: After Art Setup";
AIEvent.COLOR_MODE_CMYK_COMMAND_PRE =
  "AI Command Notifier: Before Color Mode CMYK";
AIEvent.COLOR_MODE_CMYK_COMMAND_POST =
  "AI Command Notifier: After Color Mode CMYK";
AIEvent.COLOR_MODE_RGB_COMMAND_PRE =
  "AI Command Notifier: Before Color Mode RGB";
AIEvent.COLOR_MODE_RGB_COMMAND_POST =
  "AI Command Notifier: After Color Mode RGB";
AIEvent.FILE_INFO_COMMAND_PRE = "AI Command Notifier: Before File Info";
AIEvent.FILE_INFO_COMMAND_POST = "AI Command Notifier: After File Info";
AIEvent.PRINT_COMMAND_PRE = "AI Command Notifier: Before Print";
AIEvent.PRINT_COMMAND_POST = "AI Command Notifier: After Print";
AIEvent.QUIT_COMMAND_PRE = "AI Command Notifier: Before Quit";
AIEvent.QUIT_COMMAND_POST = "AI Command Notifier: After Quit";
AIEvent.UNDO_COMMAND_PRE = "AI Command Notifier: Before Undo";
AIEvent.UNDO_COMMAND_POST = "AI Command Notifier: After Undo";
AIEvent.REDO_COMMAND_PRE = "AI Command Notifier: Before Redo";
AIEvent.REDO_COMMAND_POST = "AI Command Notifier: After Redo";
AIEvent.CUT_COMMAND_PRE = "AI Command Notifier: Before Cut";
AIEvent.CUT_COMMAND_POST = "AI Command Notifier: After Cut";
AIEvent.COPY_COMMAND_PRE = "AI Command Notifier: Before Copy";
AIEvent.COPY_COMMAND_POST = "AI Command Notifier: After Copy";
AIEvent.PASTE_COMMAND_PRE = "AI Command Notifier: Before Paste";
AIEvent.PASTE_COMMAND_POST = "AI Command Notifier: After Paste";
AIEvent.PASTE_IN_FRONT_COMMAND_PRE =
  "AI Command Notifier: Before Paste in Front";
AIEvent.PASTE_IN_FRONT_COMMAND_POST =
  "AI Command Notifier: After Paste in Front";
AIEvent.PASTE_IN_BACK_COMMAND_PRE = "AI Command Notifier: Before Paste in Back";
AIEvent.PASTE_IN_BACK_COMMAND_POST = "AI Command Notifier: After Paste in Back";
AIEvent.PASTE_IN_PLACE_COMMAND_PRE =
  "AI Command Notifier: Before Paste in Place";
AIEvent.PASTE_IN_PLACE_COMMAND_POST =
  "AI Command Notifier: After Paste in Place";
AIEvent.PASTE_IN_ALL_ARTBOARDS_COMMAND_PRE =
  "AI Command Notifier: Before Paste in All Artboards";
AIEvent.PASTE_IN_ALL_ARTBOARDS_COMMAND_POST =
  "AI Command Notifier: After Paste in All Artboards";
AIEvent.CLEAR_COMMAND_PRE = "AI Command Notifier: Before Clear";
AIEvent.CLEAR_COMMAND_POST = "AI Command Notifier: After Clear";
AIEvent.FIND_AND_REPLACE_COMMAND_PRE =
  "AI Command Notifier: Before Find and Replace";
AIEvent.FIND_AND_REPLACE_COMMAND_POST =
  "AI Command Notifier: After Find and Replace";
AIEvent.FIND_NEXT_COMMAND_PRE = "AI Command Notifier: Before Find Next";
AIEvent.FIND_NEXT_COMMAND_POST = "AI Command Notifier: After Find Next";
AIEvent.CHECK_SPELLING_COMMAND_PRE =
  "AI Command Notifier: Before Check Spelling";
AIEvent.CHECK_SPELLING_COMMAND_POST =
  "AI Command Notifier: After Check Spelling";
AIEvent.EDIT_CUSTOM_DICTIONARY_COMMAND_PRE =
  "AI Command Notifier: Before Edit Custom Dictionary...";
AIEvent.EDIT_CUSTOM_DICTIONARY_COMMAND_POST =
  "AI Command Notifier: After Edit Custom Dictionary...";
AIEvent.DEFINE_PATTERN_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Define Pattern Menu Item";
AIEvent.DEFINE_PATTERN_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Define Pattern Menu Item";
AIEvent.RECOLOR_ART_DIALOG_COMMAND_PRE =
  "AI Command Notifier: Before Recolor Art Dialog";
AIEvent.RECOLOR_ART_DIALOG_COMMAND_POST =
  "AI Command Notifier: After Recolor Art Dialog";
AIEvent.ADJUST3_COMMAND_PRE = "AI Command Notifier: Before Adjust3";
AIEvent.ADJUST3_COMMAND_POST = "AI Command Notifier: After Adjust3";
AIEvent.COLORS3_COMMAND_PRE = "AI Command Notifier: Before Colors3";
AIEvent.COLORS3_COMMAND_POST = "AI Command Notifier: After Colors3";
AIEvent.COLORS4_COMMAND_PRE = "AI Command Notifier: Before Colors4";
AIEvent.COLORS4_COMMAND_POST = "AI Command Notifier: After Colors4";
AIEvent.COLORS5_COMMAND_PRE = "AI Command Notifier: Before Colors5";
AIEvent.COLORS5_COMMAND_POST = "AI Command Notifier: After Colors5";
AIEvent.COLORS8_COMMAND_PRE = "AI Command Notifier: Before Colors8";
AIEvent.COLORS8_COMMAND_POST = "AI Command Notifier: After Colors8";
AIEvent.COLORS7_COMMAND_PRE = "AI Command Notifier: Before Colors7";
AIEvent.COLORS7_COMMAND_POST = "AI Command Notifier: After Colors7";
AIEvent.COLORS9_COMMAND_PRE = "AI Command Notifier: Before Colors9";
AIEvent.COLORS9_COMMAND_POST = "AI Command Notifier: After Colors9";
AIEvent.COLORS6_COMMAND_PRE = "AI Command Notifier: Before Colors6";
AIEvent.COLORS6_COMMAND_POST = "AI Command Notifier: After Colors6";
AIEvent.OVERPRINT2_COMMAND_PRE = "AI Command Notifier: Before Overprint2";
AIEvent.OVERPRINT2_COMMAND_POST = "AI Command Notifier: After Overprint2";
AIEvent.SATURATE3_COMMAND_PRE = "AI Command Notifier: Before Saturate3";
AIEvent.SATURATE3_COMMAND_POST = "AI Command Notifier: After Saturate3";
AIEvent.EDIT_ORIGINAL_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before EditOriginal Menu Item";
AIEvent.EDIT_ORIGINAL_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After EditOriginal Menu Item";
AIEvent.TRANSPARENCY_PRESETS_COMMAND_PRE =
  "AI Command Notifier: Before Transparency Presets";
AIEvent.TRANSPARENCY_PRESETS_COMMAND_POST =
  "AI Command Notifier: After Transparency Presets";
AIEvent.TRACING_PRESETS_COMMAND_PRE =
  "AI Command Notifier: Before TracingPresets";
AIEvent.TRACING_PRESETS_COMMAND_POST =
  "AI Command Notifier: After TracingPresets";
AIEvent.PRINT_PRESETS_COMMAND_PRE = "AI Command Notifier: Before Print Presets";
AIEvent.PRINT_PRESETS_COMMAND_POST = "AI Command Notifier: After Print Presets";
AIEvent.PDF_PRESETS_COMMAND_PRE = "AI Command Notifier: Before PDF Presets";
AIEvent.PDF_PRESETS_COMMAND_POST = "AI Command Notifier: After PDF Presets";
AIEvent.SWF_PRESETS_COMMAND_PRE = "AI Command Notifier: Before SWFPresets";
AIEvent.SWF_PRESETS_COMMAND_POST = "AI Command Notifier: After SWFPresets";
AIEvent.PERSPECTIVE_GRID_PRESETS_COMMAND_PRE =
  "AI Command Notifier: Before PerspectiveGridPresets";
AIEvent.PERSPECTIVE_GRID_PRESETS_COMMAND_POST =
  "AI Command Notifier: After PerspectiveGridPresets";
AIEvent.COLOR_MATCHING_PREFERENCES_COMMAND_PRE =
  "AI Command Notifier: Before Color Matching Preferences";
AIEvent.COLOR_MATCHING_PREFERENCES_COMMAND_POST =
  "AI Command Notifier: After Color Matching Preferences";
AIEvent.ASSIGN_PROFILE_COMMAND_PRE =
  "AI Command Notifier: Before Assign Profile";
AIEvent.ASSIGN_PROFILE_COMMAND_POST =
  "AI Command Notifier: After Assign Profile";
AIEvent.KBSC_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before KBSC Menu Item";
AIEvent.KBSC_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After KBSC Menu Item";
AIEvent.PREFERENCES_COMMAND_PRE = "AI Command Notifier: Before Preferences";
AIEvent.PREFERENCES_COMMAND_POST = "AI Command Notifier: After Preferences";
AIEvent.SELECTION_PREFERENCES_COMMAND_PRE =
  "AI Command Notifier: Before Selection Preferences";
AIEvent.SELECTION_PREFERENCES_COMMAND_POST =
  "AI Command Notifier: After Selection Preferences";
AIEvent.KEYBOARD_PREFERENCES_COMMAND_PRE =
  "AI Command Notifier: Before Keyboard Preferences";
AIEvent.KEYBOARD_PREFERENCES_COMMAND_POST =
  "AI Command Notifier: After Keyboard Preferences";
AIEvent.UNIT_UNDO_PREFERENCES_COMMAND_PRE =
  "AI Command Notifier: Before Unit Undo Preferences";
AIEvent.UNIT_UNDO_PREFERENCES_COMMAND_POST =
  "AI Command Notifier: After Unit Undo Preferences";
AIEvent.GRID_PREFERENCES_COMMAND_PRE =
  "AI Command Notifier: Before Grid Preferences";
AIEvent.GRID_PREFERENCES_COMMAND_POST =
  "AI Command Notifier: After Grid Preferences";
AIEvent.SNAPOMATIC_PREFERENCES_COMMAND_PRE =
  "AI Command Notifier: Before Snapomatic Preferences";
AIEvent.SNAPOMATIC_PREFERENCES_COMMAND_POST =
  "AI Command Notifier: After Snapomatic Preferences";
AIEvent.SLICE_PREFERENCES_COMMAND_PRE =
  "AI Command Notifier: Before Slice Preferences";
AIEvent.SLICE_PREFERENCES_COMMAND_POST =
  "AI Command Notifier: After Slice Preferences";
AIEvent.HYPHENATION_PREFERENCES_COMMAND_PRE =
  "AI Command Notifier: Before Hyphenation Preferences";
AIEvent.HYPHENATION_PREFERENCES_COMMAND_POST =
  "AI Command Notifier: After Hyphenation Preferences";
AIEvent.PLUGINS_FOLDER_PREFERENCES_COMMAND_PRE =
  "AI Command Notifier: Before Plugins Folder Preferences";
AIEvent.PLUGINS_FOLDER_PREFERENCES_COMMAND_POST =
  "AI Command Notifier: After Plugins Folder Preferences";
AIEvent.USER_INTERFACE_PREFERENCES_COMMAND_PRE =
  "AI Command Notifier: Before User Interface Preferences";
AIEvent.USER_INTERFACE_PREFERENCES_COMMAND_POST =
  "AI Command Notifier: After User Interface Preferences";
AIEvent.FILE_CLIPBOARD_PREF_COMMAND_PRE =
  "AI Command Notifier: Before FileClipboardPref";
AIEvent.FILE_CLIPBOARD_PREF_COMMAND_POST =
  "AI Command Notifier: After FileClipboardPref";
AIEvent.BLACK_PREF_COMMAND_PRE = "AI Command Notifier: Before BlackPref";
AIEvent.BLACK_PREF_COMMAND_POST = "AI Command Notifier: After BlackPref";
AIEvent.TRANSFORM_AGAIN_COMMAND_PRE =
  "AI Command Notifier: Before Transform Again";
AIEvent.TRANSFORM_AGAIN_COMMAND_POST =
  "AI Command Notifier: After Transform Again";
AIEvent.MOVE_OBJECTS_COMMAND_PRE = "AI Command Notifier: Before Move Objects";
AIEvent.MOVE_OBJECTS_COMMAND_POST = "AI Command Notifier: After Move Objects";
AIEvent.TRANSFORM_ROTATE_COMMAND_PRE =
  "AI Command Notifier: Before Transform - Rotate";
AIEvent.TRANSFORM_ROTATE_COMMAND_POST =
  "AI Command Notifier: After Transform - Rotate";
AIEvent.TRANSFORM_REFLECT_COMMAND_PRE =
  "AI Command Notifier: Before Transform - Reflect";
AIEvent.TRANSFORM_REFLECT_COMMAND_POST =
  "AI Command Notifier: After Transform - Reflect";
AIEvent.TRANSFORM_SCALE_COMMAND_PRE =
  "AI Command Notifier: Before Transform - Scale";
AIEvent.TRANSFORM_SCALE_COMMAND_POST =
  "AI Command Notifier: After Transform - Scale";
AIEvent.TRANSFORM_SHEAR_COMMAND_PRE =
  "AI Command Notifier: Before Transform - Shear";
AIEvent.TRANSFORM_SHEAR_COMMAND_POST =
  "AI Command Notifier: After Transform - Shear";
AIEvent.TRANSFORM_V23_COMMAND_PRE = "AI Command Notifier: Before Transform v23";
AIEvent.TRANSFORM_V23_COMMAND_POST = "AI Command Notifier: After Transform v23";
AIEvent.AI_RESET_BOUNDING_BOX_COMMAND_PRE =
  "AI Command Notifier: Before AI Reset Bounding Box";
AIEvent.AI_RESET_BOUNDING_BOX_COMMAND_POST =
  "AI Command Notifier: After AI Reset Bounding Box";
AIEvent.SEND_TO_FRONT_COMMAND_PRE = "AI Command Notifier: Before Send to Front";
AIEvent.SEND_TO_FRONT_COMMAND_POST = "AI Command Notifier: After Send to Front";
AIEvent.SEND_FORWARD_COMMAND_PRE = "AI Command Notifier: Before Send Forward";
AIEvent.SEND_FORWARD_COMMAND_POST = "AI Command Notifier: After Send Forward";
AIEvent.SEND_BACKWARD_COMMAND_PRE = "AI Command Notifier: Before Send Backward";
AIEvent.SEND_BACKWARD_COMMAND_POST = "AI Command Notifier: After Send Backward";
AIEvent.SEND_TO_BACK_COMMAND_PRE = "AI Command Notifier: Before Send to Back";
AIEvent.SEND_TO_BACK_COMMAND_POST = "AI Command Notifier: After Send to Back";
AIEvent.SELECTION_HAT2_COMMAND_PRE =
  "AI Command Notifier: Before Selection Hat 2";
AIEvent.SELECTION_HAT2_COMMAND_POST =
  "AI Command Notifier: After Selection Hat 2";
AIEvent.GROUP_COMMAND_PRE = "AI Command Notifier: Before Group";
AIEvent.GROUP_COMMAND_POST = "AI Command Notifier: After Group";
AIEvent.UNGROUP_COMMAND_PRE = "AI Command Notifier: Before Ungroup";
AIEvent.UNGROUP_COMMAND_POST = "AI Command Notifier: After Ungroup";
AIEvent.LOCK_COMMAND_PRE = "AI Command Notifier: Before Lock";
AIEvent.LOCK_COMMAND_POST = "AI Command Notifier: After Lock";
AIEvent.SELECTION_HAT5_COMMAND_PRE =
  "AI Command Notifier: Before Selection Hat 5";
AIEvent.SELECTION_HAT5_COMMAND_POST =
  "AI Command Notifier: After Selection Hat 5";
AIEvent.SELECTION_HAT7_COMMAND_PRE =
  "AI Command Notifier: Before Selection Hat 7";
AIEvent.SELECTION_HAT7_COMMAND_POST =
  "AI Command Notifier: After Selection Hat 7";
AIEvent.UNLOCK_ALL_COMMAND_PRE = "AI Command Notifier: Before Unlock All";
AIEvent.UNLOCK_ALL_COMMAND_POST = "AI Command Notifier: After Unlock All";
AIEvent.HIDE_COMMAND_PRE = "AI Command Notifier: Before Hide";
AIEvent.HIDE_COMMAND_POST = "AI Command Notifier: After Hide";
AIEvent.SELECTION_HAT4_COMMAND_PRE =
  "AI Command Notifier: Before Selection Hat 4";
AIEvent.SELECTION_HAT4_COMMAND_POST =
  "AI Command Notifier: After Selection Hat 4";
AIEvent.SELECTION_HAT6_COMMAND_PRE =
  "AI Command Notifier: Before Selection Hat 6";
AIEvent.SELECTION_HAT6_COMMAND_POST =
  "AI Command Notifier: After Selection Hat 6";
AIEvent.UNHIDE_ALL_COMMAND_PRE = "AI Command Notifier: Before Unhide All";
AIEvent.UNHIDE_ALL_COMMAND_POST = "AI Command Notifier: After Unhide All";
AIEvent.EXPAND3_COMMAND_PRE = "AI Command Notifier: Before Expand3";
AIEvent.EXPAND3_COMMAND_POST = "AI Command Notifier: After Expand3";
AIEvent.EXPAND_STYLE_COMMAND_PRE = "AI Command Notifier: Before Expand Style";
AIEvent.EXPAND_STYLE_COMMAND_POST = "AI Command Notifier: After Expand Style";
AIEvent.FLATTEN_TRANSPARENCY1_COMMAND_PRE =
  "AI Command Notifier: Before FlattenTransparency1";
AIEvent.FLATTEN_TRANSPARENCY1_COMMAND_POST =
  "AI Command Notifier: After FlattenTransparency1";
AIEvent.RASTERIZE8_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Rasterize 8 menu item";
AIEvent.RASTERIZE8_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Rasterize 8 menu item";
AIEvent.MAKE_MESH_COMMAND_PRE = "AI Command Notifier: Before make mesh";
AIEvent.MAKE_MESH_COMMAND_POST = "AI Command Notifier: After make mesh";
AIEvent.AI_OBJECT_MOSAIC_PLUG_IN4_COMMAND_PRE =
  "AI Command Notifier: Before AI Object Mosaic Plug-in4";
AIEvent.AI_OBJECT_MOSAIC_PLUG_IN4_COMMAND_POST =
  "AI Command Notifier: After AI Object Mosaic Plug-in4";
AIEvent.TRIM_MARK_V25_COMMAND_PRE = "AI Command Notifier: Before TrimMark v25";
AIEvent.TRIM_MARK_V25_COMMAND_POST = "AI Command Notifier: After TrimMark v25";
AIEvent.AI_SLICE_MAKE_SLICE_COMMAND_PRE =
  "AI Command Notifier: Before AISlice Make Slice";
AIEvent.AI_SLICE_MAKE_SLICE_COMMAND_POST =
  "AI Command Notifier: After AISlice Make Slice";
AIEvent.AI_SLICE_RELEASE_SLICE_COMMAND_PRE =
  "AI Command Notifier: Before AISlice Release Slice";
AIEvent.AI_SLICE_RELEASE_SLICE_COMMAND_POST =
  "AI Command Notifier: After AISlice Release Slice";
AIEvent.AI_SLICE_CREATE_FROM_GUIDES_COMMAND_PRE =
  "AI Command Notifier: Before AISlice Create from Guides";
AIEvent.AI_SLICE_CREATE_FROM_GUIDES_COMMAND_POST =
  "AI Command Notifier: After AISlice Create from Guides";
AIEvent.AI_SLICE_CREATE_FROM_SELECTION_COMMAND_PRE =
  "AI Command Notifier: Before AISlice Create from Selection";
AIEvent.AI_SLICE_CREATE_FROM_SELECTION_COMMAND_POST =
  "AI Command Notifier: After AISlice Create from Selection";
AIEvent.AI_SLICE_DUPLICATE_COMMAND_PRE =
  "AI Command Notifier: Before AISlice Duplicate";
AIEvent.AI_SLICE_DUPLICATE_COMMAND_POST =
  "AI Command Notifier: After AISlice Duplicate";
AIEvent.AI_SLICE_COMBINE_COMMAND_PRE =
  "AI Command Notifier: Before AISlice Combine";
AIEvent.AI_SLICE_COMBINE_COMMAND_POST =
  "AI Command Notifier: After AISlice Combine";
AIEvent.AI_SLICE_DIVIDE_COMMAND_PRE =
  "AI Command Notifier: Before AISlice Divide";
AIEvent.AI_SLICE_DIVIDE_COMMAND_POST =
  "AI Command Notifier: After AISlice Divide";
AIEvent.AI_SLICE_DELETE_ALL_SLICES_COMMAND_PRE =
  "AI Command Notifier: Before AISlice Delete All Slices";
AIEvent.AI_SLICE_DELETE_ALL_SLICES_COMMAND_POST =
  "AI Command Notifier: After AISlice Delete All Slices";
AIEvent.AI_SLICE_SLICE_OPTIONS_COMMAND_PRE =
  "AI Command Notifier: Before AISlice Slice Options";
AIEvent.AI_SLICE_SLICE_OPTIONS_COMMAND_POST =
  "AI Command Notifier: After AISlice Slice Options";
AIEvent.AI_SLICE_CLIP_TO_ARTBOARD_COMMAND_PRE =
  "AI Command Notifier: Before AISlice Clip to Artboard";
AIEvent.AI_SLICE_CLIP_TO_ARTBOARD_COMMAND_POST =
  "AI Command Notifier: After AISlice Clip to Artboard";
AIEvent.JOIN_COMMAND_PRE = "AI Command Notifier: Before Join";
AIEvent.JOIN_COMMAND_POST = "AI Command Notifier: After Join";
AIEvent.AVERAGE_COMMAND_PRE = "AI Command Notifier: Before Average";
AIEvent.AVERAGE_COMMAND_POST = "AI Command Notifier: After Average";
AIEvent.OFFSET_PATH_V22_COMMAND_PRE =
  "AI Command Notifier: Before OffsetPath v22";
AIEvent.OFFSET_PATH_V22_COMMAND_POST =
  "AI Command Notifier: After OffsetPath v22";
AIEvent.OFFSET_PATH_V23_COMMAND_PRE =
  "AI Command Notifier: Before OffsetPath v23";
AIEvent.OFFSET_PATH_V23_COMMAND_POST =
  "AI Command Notifier: After OffsetPath v23";
AIEvent.SIMPLIFY_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before simplify menu item";
AIEvent.SIMPLIFY_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After simplify menu item";
AIEvent.ADD_ANCHOR_POINTS2_COMMAND_PRE =
  "AI Command Notifier: Before Add Anchor Points2";
AIEvent.ADD_ANCHOR_POINTS2_COMMAND_POST =
  "AI Command Notifier: After Add Anchor Points2";
AIEvent.REMOVE_ANCHOR_POINTS_MENU_COMMAND_PRE =
  "AI Command Notifier: Before Remove Anchor Points menu";
AIEvent.REMOVE_ANCHOR_POINTS_MENU_COMMAND_POST =
  "AI Command Notifier: After Remove Anchor Points menu";
AIEvent.KNIFE_TOOL2_COMMAND_PRE = "AI Command Notifier: Before Knife Tool2";
AIEvent.KNIFE_TOOL2_COMMAND_POST = "AI Command Notifier: After Knife Tool2";
AIEvent.ROWS_AND_COLUMNS_COMMAND_PRE =
  "AI Command Notifier: Before Rows and Columns....";
AIEvent.ROWS_AND_COLUMNS_COMMAND_POST =
  "AI Command Notifier: After Rows and Columns....";
AIEvent.CLEANUP_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before cleanup menu item";
AIEvent.CLEANUP_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After cleanup menu item";
AIEvent.PATH_BLEND_MAKE_COMMAND_PRE =
  "AI Command Notifier: Before Path Blend Make";
AIEvent.PATH_BLEND_MAKE_COMMAND_POST =
  "AI Command Notifier: After Path Blend Make";
AIEvent.PATH_BLEND_RELEASE_COMMAND_PRE =
  "AI Command Notifier: Before Path Blend Release";
AIEvent.PATH_BLEND_RELEASE_COMMAND_POST =
  "AI Command Notifier: After Path Blend Release";
AIEvent.PATH_BLEND_OPTIONS_COMMAND_PRE =
  "AI Command Notifier: Before Path Blend Options";
AIEvent.PATH_BLEND_OPTIONS_COMMAND_POST =
  "AI Command Notifier: After Path Blend Options";
AIEvent.PATH_BLEND_EXPAND_COMMAND_PRE =
  "AI Command Notifier: Before Path Blend Expand";
AIEvent.PATH_BLEND_EXPAND_COMMAND_POST =
  "AI Command Notifier: After Path Blend Expand";
AIEvent.PATH_BLEND_REPLACE_SPINE_COMMAND_PRE =
  "AI Command Notifier: Before Path Blend Replace Spine";
AIEvent.PATH_BLEND_REPLACE_SPINE_COMMAND_POST =
  "AI Command Notifier: After Path Blend Replace Spine";
AIEvent.PATH_BLEND_REVERSE_SPINE_COMMAND_PRE =
  "AI Command Notifier: Before Path Blend Reverse Spine";
AIEvent.PATH_BLEND_REVERSE_SPINE_COMMAND_POST =
  "AI Command Notifier: After Path Blend Reverse Spine";
AIEvent.PATH_BLEND_REVERSE_STACK_COMMAND_PRE =
  "AI Command Notifier: Before Path Blend Reverse Stack";
AIEvent.PATH_BLEND_REVERSE_STACK_COMMAND_POST =
  "AI Command Notifier: After Path Blend Reverse Stack";
AIEvent.MAKE_WARP_COMMAND_PRE = "AI Command Notifier: Before Make Warp";
AIEvent.MAKE_WARP_COMMAND_POST = "AI Command Notifier: After Make Warp";
AIEvent.CREATE_ENVELOPE_GRID_COMMAND_PRE =
  "AI Command Notifier: Before Create Envelope Grid";
AIEvent.CREATE_ENVELOPE_GRID_COMMAND_POST =
  "AI Command Notifier: After Create Envelope Grid";
AIEvent.MAKE_ENVELOPE_COMMAND_PRE = "AI Command Notifier: Before Make Envelope";
AIEvent.MAKE_ENVELOPE_COMMAND_POST = "AI Command Notifier: After Make Envelope";
AIEvent.RELEASE_ENVELOPE_COMMAND_PRE =
  "AI Command Notifier: Before Release Envelope";
AIEvent.RELEASE_ENVELOPE_COMMAND_POST =
  "AI Command Notifier: After Release Envelope";
AIEvent.ENVELOPE_OPTIONS_COMMAND_PRE =
  "AI Command Notifier: Before Envelope Options";
AIEvent.ENVELOPE_OPTIONS_COMMAND_POST =
  "AI Command Notifier: After Envelope Options";
AIEvent.EXPAND_ENVELOPE_COMMAND_PRE =
  "AI Command Notifier: Before Expand Envelope";
AIEvent.EXPAND_ENVELOPE_COMMAND_POST =
  "AI Command Notifier: After Expand Envelope";
AIEvent.EDIT_ENVELOPE_CONTENTS_COMMAND_PRE =
  "AI Command Notifier: Before Edit Envelope Contents";
AIEvent.EDIT_ENVELOPE_CONTENTS_COMMAND_POST =
  "AI Command Notifier: After Edit Envelope Contents";
AIEvent.ATTACH_TO_ACTIVE_PLANE_COMMAND_PRE =
  "AI Command Notifier: Before Attach to Active Plane";
AIEvent.ATTACH_TO_ACTIVE_PLANE_COMMAND_POST =
  "AI Command Notifier: After Attach to Active Plane";
AIEvent.RELEASE_WITH_PERSPECTIVE_COMMAND_PRE =
  "AI Command Notifier: Before Release with Perspective";
AIEvent.RELEASE_WITH_PERSPECTIVE_COMMAND_POST =
  "AI Command Notifier: After Release with Perspective";
AIEvent.SHOW_OBJECT_GRID_PLANE_COMMAND_PRE =
  "AI Command Notifier: Before Show Object Grid Plane";
AIEvent.SHOW_OBJECT_GRID_PLANE_COMMAND_POST =
  "AI Command Notifier: After Show Object Grid Plane";
AIEvent.EDIT_ORIGINAL_OBJECT_COMMAND_PRE =
  "AI Command Notifier: Before Edit Original Object";
AIEvent.EDIT_ORIGINAL_OBJECT_COMMAND_POST =
  "AI Command Notifier: After Edit Original Object";
AIEvent.MAKE_PLANET_X_COMMAND_PRE = "AI Command Notifier: Before Make Planet X";
AIEvent.MAKE_PLANET_X_COMMAND_POST = "AI Command Notifier: After Make Planet X";
AIEvent.MARGE_PLANET_X_COMMAND_PRE =
  "AI Command Notifier: Before Marge Planet X";
AIEvent.MARGE_PLANET_X_COMMAND_POST =
  "AI Command Notifier: After Marge Planet X";
AIEvent.RELEASE_PLANET_X_COMMAND_PRE =
  "AI Command Notifier: Before Release Planet X";
AIEvent.RELEASE_PLANET_X_COMMAND_POST =
  "AI Command Notifier: After Release Planet X";
AIEvent.PLANET_X_OPTIONS_COMMAND_PRE =
  "AI Command Notifier: Before Planet X Options";
AIEvent.PLANET_X_OPTIONS_COMMAND_POST =
  "AI Command Notifier: After Planet X Options";
AIEvent.EXPAND_PLANET_X_COMMAND_PRE =
  "AI Command Notifier: Before Expand Planet X";
AIEvent.EXPAND_PLANET_X_COMMAND_POST =
  "AI Command Notifier: After Expand Planet X";
AIEvent.MAKE_TRACING_COMMAND_PRE = "AI Command Notifier: Before Make Tracing";
AIEvent.MAKE_TRACING_COMMAND_POST = "AI Command Notifier: After Make Tracing";
AIEvent.MAKE_AND_EXPAND_COMMAND_PRE =
  "AI Command Notifier: Before Make and Expand";
AIEvent.MAKE_AND_EXPAND_COMMAND_POST =
  "AI Command Notifier: After Make and Expand";
AIEvent.MAKE_AND_CONVERT_TO_LIVE_PAINT_COMMAND_PRE =
  "AI Command Notifier: Before Make and Convert to Live Paint";
AIEvent.MAKE_AND_CONVERT_TO_LIVE_PAINT_COMMAND_POST =
  "AI Command Notifier: After Make and Convert to Live Paint";
AIEvent.RELEASE_TRACING_COMMAND_PRE =
  "AI Command Notifier: Before Release Tracing";
AIEvent.RELEASE_TRACING_COMMAND_POST =
  "AI Command Notifier: After Release Tracing";
AIEvent.TRACING_OPTIONS_COMMAND_PRE =
  "AI Command Notifier: Before Tracing Options";
AIEvent.TRACING_OPTIONS_COMMAND_POST =
  "AI Command Notifier: After Tracing Options";
AIEvent.EXPAND_TRACING_COMMAND_PRE =
  "AI Command Notifier: Before Expand Tracing";
AIEvent.EXPAND_TRACING_COMMAND_POST =
  "AI Command Notifier: After Expand Tracing";
AIEvent.EXPAND_AS_VIEWED_COMMAND_PRE =
  "AI Command Notifier: Before Expand as Viewed";
AIEvent.EXPAND_AS_VIEWED_COMMAND_POST =
  "AI Command Notifier: After Expand as Viewed";
AIEvent.PAINT_TRACING_COMMAND_PRE = "AI Command Notifier: Before Paint Tracing";
AIEvent.PAINT_TRACING_COMMAND_POST = "AI Command Notifier: After Paint Tracing";
AIEvent.SHOW_NO_IMAGE_COMMAND_PRE = "AI Command Notifier: Before ShowNoImage";
AIEvent.SHOW_NO_IMAGE_COMMAND_POST = "AI Command Notifier: After ShowNoImage";
AIEvent.SHOW_ORIGINAL_IMAGE_COMMAND_PRE =
  "AI Command Notifier: Before ShowOriginalImage";
AIEvent.SHOW_ORIGINAL_IMAGE_COMMAND_POST =
  "AI Command Notifier: After ShowOriginalImage";
AIEvent.SHOW_PREPROCESSED_IMAGE_COMMAND_PRE =
  "AI Command Notifier: Before Show Preprocessed Image";
AIEvent.SHOW_PREPROCESSED_IMAGE_COMMAND_POST =
  "AI Command Notifier: After Show Preprocessed Image";
AIEvent.SHOW_TRANSPARENT_IMAGE_COMMAND_PRE =
  "AI Command Notifier: Before ShowTransparentImage";
AIEvent.SHOW_TRANSPARENT_IMAGE_COMMAND_POST =
  "AI Command Notifier: After ShowTransparentImage";
AIEvent.SHOW_NO_ARTWORK_COMMAND_PRE =
  "AI Command Notifier: Before ShowNoArtwork";
AIEvent.SHOW_NO_ARTWORK_COMMAND_POST =
  "AI Command Notifier: After ShowNoArtwork";
AIEvent.SHOW_ARTWORK_COMMAND_PRE = "AI Command Notifier: Before ShowArtwork";
AIEvent.SHOW_ARTWORK_COMMAND_POST = "AI Command Notifier: After ShowArtwork";
AIEvent.SHOW_PATHS_COMMAND_PRE = "AI Command Notifier: Before ShowPaths";
AIEvent.SHOW_PATHS_COMMAND_POST = "AI Command Notifier: After ShowPaths";
AIEvent.SHOW_PATHS_AND_TRANSPARENT_ARTWORK_COMMAND_PRE =
  "AI Command Notifier: Before ShowPathsAndTransparentArtwork";
AIEvent.SHOW_PATHS_AND_TRANSPARENT_ARTWORK_COMMAND_POST =
  "AI Command Notifier: After ShowPathsAndTransparentArtwork";
AIEvent.MAKE_TEXT_WRAP_COMMAND_PRE =
  "AI Command Notifier: Before Make Text Wrap";
AIEvent.MAKE_TEXT_WRAP_COMMAND_POST =
  "AI Command Notifier: After Make Text Wrap";
AIEvent.RELEASE_TEXT_WRAP_COMMAND_PRE =
  "AI Command Notifier: Before Release Text Wrap";
AIEvent.RELEASE_TEXT_WRAP_COMMAND_POST =
  "AI Command Notifier: After Release Text Wrap";
AIEvent.TEXT_WRAP_OPTIONS_COMMAND_PRE =
  "AI Command Notifier: Before Text Wrap Options...";
AIEvent.TEXT_WRAP_OPTIONS_COMMAND_POST =
  "AI Command Notifier: After Text Wrap Options...";
AIEvent.MAKE_MASK_COMMAND_PRE = "AI Command Notifier: Before Make Mask";
AIEvent.MAKE_MASK_COMMAND_POST = "AI Command Notifier: After Make Mask";
AIEvent.RELEASE_MASK_COMMAND_PRE = "AI Command Notifier: Before Release Mask";
AIEvent.RELEASE_MASK_COMMAND_POST = "AI Command Notifier: After Release Mask";
AIEvent.EDIT_MASK_COMMAND_PRE = "AI Command Notifier: Before Edit Mask";
AIEvent.EDIT_MASK_COMMAND_POST = "AI Command Notifier: After Edit Mask";
AIEvent.MAKE_COMPOUND_PATH_COMMAND_PRE =
  "AI Command Notifier: Before Make Compound Path";
AIEvent.MAKE_COMPOUND_PATH_COMMAND_POST =
  "AI Command Notifier: After Make Compound Path";
AIEvent.RELEASE_COMPOUND_PATH_COMMAND_PRE =
  "AI Command Notifier: Before Release Compound Path";
AIEvent.RELEASE_COMPOUND_PATH_COMMAND_POST =
  "AI Command Notifier: After Release Compound Path";
AIEvent.MAKE_CROP_MARKS_COMMAND_PRE =
  "AI Command Notifier: Before Make Crop Marks";
AIEvent.MAKE_CROP_MARKS_COMMAND_POST =
  "AI Command Notifier: After Make Crop Marks";
AIEvent.RE_ARRANGE_ARTBOARDS_COMMAND_PRE =
  "AI Command Notifier: Before ReArrange Artboards";
AIEvent.RE_ARRANGE_ARTBOARDS_COMMAND_POST =
  "AI Command Notifier: After ReArrange Artboards";
AIEvent.FIT_ARTBOARD_TO_ARTWORK_BOUNDS_COMMAND_PRE =
  "AI Command Notifier: Before Fit Artboard to artwork bounds";
AIEvent.FIT_ARTBOARD_TO_ARTWORK_BOUNDS_COMMAND_POST =
  "AI Command Notifier: After Fit Artboard to artwork bounds";
AIEvent.FIT_ARTBOARD_TO_SELECTED_ART_COMMAND_PRE =
  "AI Command Notifier: Before Fit Artboard to selected Art";
AIEvent.FIT_ARTBOARD_TO_SELECTED_ART_COMMAND_POST =
  "AI Command Notifier: After Fit Artboard to selected Art";
AIEvent.SET_GRAPH_STYLE_COMMAND_PRE =
  "AI Command Notifier: Before Set Graph Style";
AIEvent.SET_GRAPH_STYLE_COMMAND_POST =
  "AI Command Notifier: After Set Graph Style";
AIEvent.EDIT_GRAPH_DATA_COMMAND_PRE =
  "AI Command Notifier: Before Edit Graph Data";
AIEvent.EDIT_GRAPH_DATA_COMMAND_POST =
  "AI Command Notifier: After Edit Graph Data";
AIEvent.DEFINE_GRAPH_DESIGN_COMMAND_PRE =
  "AI Command Notifier: Before Define Graph Design";
AIEvent.DEFINE_GRAPH_DESIGN_COMMAND_POST =
  "AI Command Notifier: After Define Graph Design";
AIEvent.SET_BAR_DESIGN_COMMAND_PRE =
  "AI Command Notifier: Before Set Bar Design";
AIEvent.SET_BAR_DESIGN_COMMAND_POST =
  "AI Command Notifier: After Set Bar Design";
AIEvent.SET_ICON_DESIGN_COMMAND_PRE =
  "AI Command Notifier: Before Set Icon Design";
AIEvent.SET_ICON_DESIGN_COMMAND_POST =
  "AI Command Notifier: After Set Icon Design";
AIEvent.ALTERNATE_GLYPH_PALETTE_PLUGIN_COMMAND_PRE =
  "AI Command Notifier: Before alternate glyph palette plugin";
AIEvent.ALTERNATE_GLYPH_PALETTE_PLUGIN_COMMAND_POST =
  "AI Command Notifier: After alternate glyph palette plugin";
AIEvent.AREA_TEXT_OPTIONS_COMMAND_PRE =
  "AI Command Notifier: Before Area Text Options";
AIEvent.AREA_TEXT_OPTIONS_COMMAND_POST =
  "AI Command Notifier: After Area Text Options";
AIEvent.TEXT_PATH_TYPE_RAINBOW_COMMAND_PRE =
  "AI Command Notifier: Before Text Path Type Rainbow";
AIEvent.TEXT_PATH_TYPE_RAINBOW_COMMAND_POST =
  "AI Command Notifier: After Text Path Type Rainbow";
AIEvent.TEXT_PATH_TYPE_SKEW_COMMAND_PRE =
  "AI Command Notifier: Before Text Path Type Skew";
AIEvent.TEXT_PATH_TYPE_SKEW_COMMAND_POST =
  "AI Command Notifier: After Text Path Type Skew";
AIEvent.TEXT_PATH_TYPE3D_COMMAND_PRE =
  "AI Command Notifier: Before Text Path Type 3d";
AIEvent.TEXT_PATH_TYPE3D_COMMAND_POST =
  "AI Command Notifier: After Text Path Type 3d";
AIEvent.TEXT_PATH_TYPE_STAIRS_COMMAND_PRE =
  "AI Command Notifier: Before Text Path Type Stairs";
AIEvent.TEXT_PATH_TYPE_STAIRS_COMMAND_POST =
  "AI Command Notifier: After Text Path Type Stairs";
AIEvent.TEXT_PATH_TYPE_GRAVITY_COMMAND_PRE =
  "AI Command Notifier: Before Text Path Type Gravity";
AIEvent.TEXT_PATH_TYPE_GRAVITY_COMMAND_POST =
  "AI Command Notifier: After Text Path Type Gravity";
AIEvent.TEXT_PATH_TYPE_OPTIONS_COMMAND_PRE =
  "AI Command Notifier: Before Text Path Type Options";
AIEvent.TEXT_PATH_TYPE_OPTIONS_COMMAND_POST =
  "AI Command Notifier: After Text Path Type Options";
AIEvent.UPDATE_SELECTED_TYPE_ON_PATH_COMMAND_PRE =
  "AI Command Notifier: Before Update Selected Type On Path";
AIEvent.UPDATE_SELECTED_TYPE_ON_PATH_COMMAND_POST =
  "AI Command Notifier: After Update Selected Type On Path";
AIEvent.CREATE_THREADED_TEXT_COMMAND_PRE =
  "AI Command Notifier: Before Create Threaded Text";
AIEvent.CREATE_THREADED_TEXT_COMMAND_POST =
  "AI Command Notifier: After Create Threaded Text";
AIEvent.RELEASE_THREADED_TEXT_SELECTION_COMMAND_PRE =
  "AI Command Notifier: Before Release Threaded Text Selection";
AIEvent.RELEASE_THREADED_TEXT_SELECTION_COMMAND_POST =
  "AI Command Notifier: After Release Threaded Text Selection";
AIEvent.REMOVE_THREADING_COMMAND_PRE =
  "AI Command Notifier: Before Remove Threading";
AIEvent.REMOVE_THREADING_COMMAND_POST =
  "AI Command Notifier: After Remove Threading";
AIEvent.ADOBE_INTERNAL_COMPOSITE_FONT_PLUGIN_COMMAND_PRE =
  "AI Command Notifier: Before Adobe internal composite font plugin";
AIEvent.ADOBE_INTERNAL_COMPOSITE_FONT_PLUGIN_COMMAND_POST =
  "AI Command Notifier: After Adobe internal composite font plugin";
AIEvent.ADOBE_KINSOKU_SETTINGS_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Kinsoku Settings";
AIEvent.ADOBE_KINSOKU_SETTINGS_COMMAND_POST =
  "AI Command Notifier: After Adobe Kinsoku Settings";
AIEvent.ADOBE_MOJI_KUMI_SETTINGS_COMMAND_PRE =
  "AI Command Notifier: Before Adobe MojiKumi Settings";
AIEvent.ADOBE_MOJI_KUMI_SETTINGS_COMMAND_POST =
  "AI Command Notifier: After Adobe MojiKumi Settings";
AIEvent.FIT_HEADLINE_COMMAND_PRE = "AI Command Notifier: Before Fit Headline";
AIEvent.FIT_HEADLINE_COMMAND_POST = "AI Command Notifier: After Fit Headline";
AIEvent.TYPE_OUTLINES_COMMAND_PRE = "AI Command Notifier: Before Type Outlines";
AIEvent.TYPE_OUTLINES_COMMAND_POST = "AI Command Notifier: After Type Outlines";
AIEvent.ADOBE_ILLUSTRATOR_FIND_FONT_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Illustrator Find Font Menu Item";
AIEvent.ADOBE_ILLUSTRATOR_FIND_FONT_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Adobe Illustrator Find Font Menu Item";
AIEvent.UPPER_CASE_CHANGE_CASE_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before UpperCase Change Case Item";
AIEvent.UPPER_CASE_CHANGE_CASE_ITEM_COMMAND_POST =
  "AI Command Notifier: After UpperCase Change Case Item";
AIEvent.LOWER_CASE_CHANGE_CASE_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before LowerCase Change Case Item";
AIEvent.LOWER_CASE_CHANGE_CASE_ITEM_COMMAND_POST =
  "AI Command Notifier: After LowerCase Change Case Item";
AIEvent.TITLE_CASE_CHANGE_CASE_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Title Case Change Case Item";
AIEvent.TITLE_CASE_CHANGE_CASE_ITEM_COMMAND_POST =
  "AI Command Notifier: After Title Case Change Case Item";
AIEvent.SENTENCE_CASE_CHANGE_CASE_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Sentence case Change Case Item";
AIEvent.SENTENCE_CASE_CHANGE_CASE_ITEM_COMMAND_POST =
  "AI Command Notifier: After Sentence case Change Case Item";
AIEvent.ADOBE_ILLUSTRATOR_SMART_PUNCTUATION_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Illustrator Smart Punctuation Menu Item";
AIEvent.ADOBE_ILLUSTRATOR_SMART_PUNCTUATION_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Adobe Illustrator Smart Punctuation Menu Item";
AIEvent.ADOBE_OPTICAL_ALIGNMENT_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Optical Alignment Item";
AIEvent.ADOBE_OPTICAL_ALIGNMENT_ITEM_COMMAND_POST =
  "AI Command Notifier: After Adobe Optical Alignment Item";
AIEvent.SHOW_HIDDEN_CHARACTERS_COMMAND_PRE =
  "AI Command Notifier: Before Show Hidden Characters";
AIEvent.SHOW_HIDDEN_CHARACTERS_COMMAND_POST =
  "AI Command Notifier: After Show Hidden Characters";
AIEvent.TYPE_ORIENTATION_HORIZONTAL_COMMAND_PRE =
  "AI Command Notifier: Before Type Orientation Horizontal";
AIEvent.TYPE_ORIENTATION_HORIZONTAL_COMMAND_POST =
  "AI Command Notifier: After Type Orientation Horizontal";
AIEvent.TYPE_ORIENTATION_VERTICAL_COMMAND_PRE =
  "AI Command Notifier: Before Type Orientation Vertical";
AIEvent.TYPE_ORIENTATION_VERTICAL_COMMAND_POST =
  "AI Command Notifier: After Type Orientation Vertical";
AIEvent.CONVERT_TO_NATIVE_TEXT_COMMAND_PRE =
  "AI Command Notifier: Before Convert To Native Text";
AIEvent.CONVERT_TO_NATIVE_TEXT_COMMAND_POST =
  "AI Command Notifier: After Convert To Native Text";
AIEvent.CONVERT_SELECTED_TEXT_TO_NATIVE_TEXT_COMMAND_PRE =
  "AI Command Notifier: Before Convert Selected Text To Native Text";
AIEvent.CONVERT_SELECTED_TEXT_TO_NATIVE_TEXT_COMMAND_POST =
  "AI Command Notifier: After Convert Selected Text To Native Text";
AIEvent.SHOW_HIDE_LEGACY_TEXT_COPIES_COMMAND_PRE =
  "AI Command Notifier: Before Show/Hide Legacy Text Copies";
AIEvent.SHOW_HIDE_LEGACY_TEXT_COPIES_COMMAND_POST =
  "AI Command Notifier: After Show/Hide Legacy Text Copies";
AIEvent.DELETE_LEGACY_TEXT_COPIES_COMMAND_PRE =
  "AI Command Notifier: Before Delete Legacy Text Copies";
AIEvent.DELETE_LEGACY_TEXT_COPIES_COMMAND_POST =
  "AI Command Notifier: After Delete Legacy Text Copies";
AIEvent.SELECT_LEGACY_TEXT_COPIES_COMMAND_PRE =
  "AI Command Notifier: Before Select Legacy Text Copies";
AIEvent.SELECT_LEGACY_TEXT_COPIES_COMMAND_POST =
  "AI Command Notifier: After Select Legacy Text Copies";
AIEvent.SELECT_ALL_COMMAND_PRE = "AI Command Notifier: Before Select All";
AIEvent.SELECT_ALL_COMMAND_POST = "AI Command Notifier: After Select All";
AIEvent.SELECT_ALL_IN_ARTBOARD_COMMAND_PRE =
  "AI Command Notifier: Before Select All In Artboard";
AIEvent.SELECT_ALL_IN_ARTBOARD_COMMAND_POST =
  "AI Command Notifier: After Select All In Artboard";
AIEvent.DESELECT_ALL_COMMAND_PRE = "AI Command Notifier: Before Deselect All";
AIEvent.DESELECT_ALL_COMMAND_POST = "AI Command Notifier: After Deselect All";
AIEvent.FIND_RESELECT_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Find Reselect menu item";
AIEvent.FIND_RESELECT_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Find Reselect menu item";
AIEvent.INVERSE_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Inverse menu item";
AIEvent.INVERSE_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Inverse menu item";
AIEvent.SELECTION_HAT8_COMMAND_PRE =
  "AI Command Notifier: Before Selection Hat 8";
AIEvent.SELECTION_HAT8_COMMAND_POST =
  "AI Command Notifier: After Selection Hat 8";
AIEvent.SELECTION_HAT9_COMMAND_PRE =
  "AI Command Notifier: Before Selection Hat 9";
AIEvent.SELECTION_HAT9_COMMAND_POST =
  "AI Command Notifier: After Selection Hat 9";
AIEvent.FIND_APPEARANCE_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Find Appearance menu item";
AIEvent.FIND_APPEARANCE_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Find Appearance menu item";
AIEvent.FIND_APPEARANCE_ATTRIBUTES_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Find Appearance Attributes menu item";
AIEvent.FIND_APPEARANCE_ATTRIBUTES_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Find Appearance Attributes menu item";
AIEvent.FIND_BLENDING_MODE_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Find Blending Mode menu item";
AIEvent.FIND_BLENDING_MODE_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Find Blending Mode menu item";
AIEvent.FIND_FILL_STROKE_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Find Fill & Stroke menu item";
AIEvent.FIND_FILL_STROKE_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Find Fill & Stroke menu item";
AIEvent.FIND_FILL_COLOR_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Find Fill Color menu item";
AIEvent.FIND_FILL_COLOR_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Find Fill Color menu item";
AIEvent.FIND_OPACITY_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Find Opacity menu item";
AIEvent.FIND_OPACITY_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Find Opacity menu item";
AIEvent.FIND_STROKE_COLOR_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Find Stroke Color menu item";
AIEvent.FIND_STROKE_COLOR_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Find Stroke Color menu item";
AIEvent.FIND_STROKE_WEIGHT_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Find Stroke Weight menu item";
AIEvent.FIND_STROKE_WEIGHT_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Find Stroke Weight menu item";
AIEvent.FIND_STYLE_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Find Style menu item";
AIEvent.FIND_STYLE_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Find Style menu item";
AIEvent.FIND_SYMBOL_INSTANCE_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Find Symbol Instance menu item";
AIEvent.FIND_SYMBOL_INSTANCE_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Find Symbol Instance menu item";
AIEvent.FIND_LINK_BLOCK_SERIES_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Find Link Block Series menu item";
AIEvent.FIND_LINK_BLOCK_SERIES_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Find Link Block Series menu item";
AIEvent.SELECTION_HAT3_COMMAND_PRE =
  "AI Command Notifier: Before Selection Hat 3";
AIEvent.SELECTION_HAT3_COMMAND_POST =
  "AI Command Notifier: After Selection Hat 3";
AIEvent.SELECTION_HAT1_COMMAND_PRE =
  "AI Command Notifier: Before Selection Hat 1";
AIEvent.SELECTION_HAT1_COMMAND_POST =
  "AI Command Notifier: After Selection Hat 1";
AIEvent.SELECTION_HAT12_COMMAND_PRE =
  "AI Command Notifier: Before Selection Hat 12";
AIEvent.SELECTION_HAT12_COMMAND_POST =
  "AI Command Notifier: After Selection Hat 12";
AIEvent.BRISTLE_BRUSH_STROKES_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Bristle Brush Strokes menu item";
AIEvent.BRISTLE_BRUSH_STROKES_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Bristle Brush Strokes menu item";
AIEvent.BRUSH_STROKES_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Brush Strokes menu item";
AIEvent.BRUSH_STROKES_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Brush Strokes menu item";
AIEvent.CLIPPING_MASKS_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Clipping Masks menu item";
AIEvent.CLIPPING_MASKS_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Clipping Masks menu item";
AIEvent.STRAY_POINTS_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Stray Points menu item";
AIEvent.STRAY_POINTS_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Stray Points menu item";
AIEvent.TEXT_OBJECTS_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Text Objects menu item";
AIEvent.TEXT_OBJECTS_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Text Objects menu item";
AIEvent.DYNAMIC_TEXT_COMMAND_PRE = "AI Command Notifier: Before Dynamic Text";
AIEvent.DYNAMIC_TEXT_COMMAND_POST = "AI Command Notifier: After Dynamic Text";
AIEvent.INPUT_TEXT_COMMAND_PRE = "AI Command Notifier: Before Input Text";
AIEvent.INPUT_TEXT_COMMAND_POST = "AI Command Notifier: After Input Text";
AIEvent.SELECTION_HAT10_COMMAND_PRE =
  "AI Command Notifier: Before Selection Hat 10";
AIEvent.SELECTION_HAT10_COMMAND_POST =
  "AI Command Notifier: After Selection Hat 10";
AIEvent.SELECTION_HAT11_COMMAND_PRE =
  "AI Command Notifier: Before Selection Hat 11";
AIEvent.SELECTION_HAT11_COMMAND_POST =
  "AI Command Notifier: After Selection Hat 11";
AIEvent.ADOBE_APPLY_LAST_EFFECT_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Apply Last Effect";
AIEvent.ADOBE_APPLY_LAST_EFFECT_COMMAND_POST =
  "AI Command Notifier: After Adobe Apply Last Effect";
AIEvent.ADOBE_LAST_EFFECT_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Last Effect";
AIEvent.ADOBE_LAST_EFFECT_COMMAND_POST =
  "AI Command Notifier: After Adobe Last Effect";
AIEvent.LIVE_RASTERIZE_EFFECT_SETTING_COMMAND_PRE =
  "AI Command Notifier: Before Live Rasterize Effect Setting";
AIEvent.LIVE_RASTERIZE_EFFECT_SETTING_COMMAND_POST =
  "AI Command Notifier: After Live Rasterize Effect Setting";
AIEvent.LIVE3D_EXTRUDE_COMMAND_PRE =
  "AI Command Notifier: Before Live 3DExtrude";
AIEvent.LIVE3D_EXTRUDE_COMMAND_POST =
  "AI Command Notifier: After Live 3DExtrude";
AIEvent.LIVE3D_REVOLVE_COMMAND_PRE =
  "AI Command Notifier: Before Live 3DRevolve";
AIEvent.LIVE3D_REVOLVE_COMMAND_POST =
  "AI Command Notifier: After Live 3DRevolve";
AIEvent.LIVE3D_ROTATE_COMMAND_PRE = "AI Command Notifier: Before Live 3DRotate";
AIEvent.LIVE3D_ROTATE_COMMAND_POST = "AI Command Notifier: After Live 3DRotate";
AIEvent.LIVE_RECTANGLE_COMMAND_PRE =
  "AI Command Notifier: Before Live Rectangle";
AIEvent.LIVE_RECTANGLE_COMMAND_POST =
  "AI Command Notifier: After Live Rectangle";
AIEvent.LIVE_ROUNDED_RECTANGLE_COMMAND_PRE =
  "AI Command Notifier: Before Live Rounded Rectangle";
AIEvent.LIVE_ROUNDED_RECTANGLE_COMMAND_POST =
  "AI Command Notifier: After Live Rounded Rectangle";
AIEvent.LIVE_ELLIPSE_COMMAND_PRE = "AI Command Notifier: Before Live Ellipse";
AIEvent.LIVE_ELLIPSE_COMMAND_POST = "AI Command Notifier: After Live Ellipse";
AIEvent.LIVE_TRIM_MARKS_COMMAND_PRE =
  "AI Command Notifier: Before Live Trim Marks";
AIEvent.LIVE_TRIM_MARKS_COMMAND_POST =
  "AI Command Notifier: After Live Trim Marks";
AIEvent.LIVE_FREE_DISTORT_COMMAND_PRE =
  "AI Command Notifier: Before Live Free Distort";
AIEvent.LIVE_FREE_DISTORT_COMMAND_POST =
  "AI Command Notifier: After Live Free Distort";
AIEvent.LIVE_PUCKER_BLOAT_COMMAND_PRE =
  "AI Command Notifier: Before Live Pucker & Bloat";
AIEvent.LIVE_PUCKER_BLOAT_COMMAND_POST =
  "AI Command Notifier: After Live Pucker & Bloat";
AIEvent.LIVE_ROUGHEN_COMMAND_PRE = "AI Command Notifier: Before Live Roughen";
AIEvent.LIVE_ROUGHEN_COMMAND_POST = "AI Command Notifier: After Live Roughen";
AIEvent.LIVE_TRANSFORM_COMMAND_PRE =
  "AI Command Notifier: Before Live Transform";
AIEvent.LIVE_TRANSFORM_COMMAND_POST =
  "AI Command Notifier: After Live Transform";
AIEvent.LIVE_SCRIBBLE_AND_TWEAK_COMMAND_PRE =
  "AI Command Notifier: Before Live Scribble and Tweak";
AIEvent.LIVE_SCRIBBLE_AND_TWEAK_COMMAND_POST =
  "AI Command Notifier: After Live Scribble and Tweak";
AIEvent.LIVE_TWIST_COMMAND_PRE = "AI Command Notifier: Before Live Twist";
AIEvent.LIVE_TWIST_COMMAND_POST = "AI Command Notifier: After Live Twist";
AIEvent.LIVE_ZIG_ZAG_COMMAND_PRE = "AI Command Notifier: Before Live Zig Zag";
AIEvent.LIVE_ZIG_ZAG_COMMAND_POST = "AI Command Notifier: After Live Zig Zag";
AIEvent.LIVE_OFFSET_PATH_COMMAND_PRE =
  "AI Command Notifier: Before Live Offset Path";
AIEvent.LIVE_OFFSET_PATH_COMMAND_POST =
  "AI Command Notifier: After Live Offset Path";
AIEvent.LIVE_OUTLINE_OBJECT_COMMAND_PRE =
  "AI Command Notifier: Before Live Outline Object";
AIEvent.LIVE_OUTLINE_OBJECT_COMMAND_POST =
  "AI Command Notifier: After Live Outline Object";
AIEvent.LIVE_OUTLINE_STROKE_COMMAND_PRE =
  "AI Command Notifier: Before Live Outline Stroke";
AIEvent.LIVE_OUTLINE_STROKE_COMMAND_POST =
  "AI Command Notifier: After Live Outline Stroke";
AIEvent.LIVE_PATHFINDER_ADD_COMMAND_PRE =
  "AI Command Notifier: Before Live Pathfinder Add";
AIEvent.LIVE_PATHFINDER_ADD_COMMAND_POST =
  "AI Command Notifier: After Live Pathfinder Add";
AIEvent.LIVE_PATHFINDER_INTERSECT_COMMAND_PRE =
  "AI Command Notifier: Before Live Pathfinder Intersect";
AIEvent.LIVE_PATHFINDER_INTERSECT_COMMAND_POST =
  "AI Command Notifier: After Live Pathfinder Intersect";
AIEvent.LIVE_PATHFINDER_EXCLUDE_COMMAND_PRE =
  "AI Command Notifier: Before Live Pathfinder Exclude";
AIEvent.LIVE_PATHFINDER_EXCLUDE_COMMAND_POST =
  "AI Command Notifier: After Live Pathfinder Exclude";
AIEvent.LIVE_PATHFINDER_SUBTRACT_COMMAND_PRE =
  "AI Command Notifier: Before Live Pathfinder Subtract";
AIEvent.LIVE_PATHFINDER_SUBTRACT_COMMAND_POST =
  "AI Command Notifier: After Live Pathfinder Subtract";
AIEvent.LIVE_PATHFINDER_MINUS_BACK_COMMAND_PRE =
  "AI Command Notifier: Before Live Pathfinder Minus Back";
AIEvent.LIVE_PATHFINDER_MINUS_BACK_COMMAND_POST =
  "AI Command Notifier: After Live Pathfinder Minus Back";
AIEvent.LIVE_PATHFINDER_DIVIDE_COMMAND_PRE =
  "AI Command Notifier: Before Live Pathfinder Divide";
AIEvent.LIVE_PATHFINDER_DIVIDE_COMMAND_POST =
  "AI Command Notifier: After Live Pathfinder Divide";
AIEvent.LIVE_PATHFINDER_TRIM_COMMAND_PRE =
  "AI Command Notifier: Before Live Pathfinder Trim";
AIEvent.LIVE_PATHFINDER_TRIM_COMMAND_POST =
  "AI Command Notifier: After Live Pathfinder Trim";
AIEvent.LIVE_PATHFINDER_MERGE_COMMAND_PRE =
  "AI Command Notifier: Before Live Pathfinder Merge";
AIEvent.LIVE_PATHFINDER_MERGE_COMMAND_POST =
  "AI Command Notifier: After Live Pathfinder Merge";
AIEvent.LIVE_PATHFINDER_CROP_COMMAND_PRE =
  "AI Command Notifier: Before Live Pathfinder Crop";
AIEvent.LIVE_PATHFINDER_CROP_COMMAND_POST =
  "AI Command Notifier: After Live Pathfinder Crop";
AIEvent.LIVE_PATHFINDER_OUTLINE_COMMAND_PRE =
  "AI Command Notifier: Before Live Pathfinder Outline";
AIEvent.LIVE_PATHFINDER_OUTLINE_COMMAND_POST =
  "AI Command Notifier: After Live Pathfinder Outline";
AIEvent.LIVE_PATHFINDER_HARD_MIX_COMMAND_PRE =
  "AI Command Notifier: Before Live Pathfinder Hard Mix";
AIEvent.LIVE_PATHFINDER_HARD_MIX_COMMAND_POST =
  "AI Command Notifier: After Live Pathfinder Hard Mix";
AIEvent.LIVE_PATHFINDER_SOFT_MIX_COMMAND_PRE =
  "AI Command Notifier: Before Live Pathfinder Soft Mix";
AIEvent.LIVE_PATHFINDER_SOFT_MIX_COMMAND_POST =
  "AI Command Notifier: After Live Pathfinder Soft Mix";
AIEvent.LIVE_PATHFINDER_TRAP_COMMAND_PRE =
  "AI Command Notifier: Before Live Pathfinder Trap";
AIEvent.LIVE_PATHFINDER_TRAP_COMMAND_POST =
  "AI Command Notifier: After Live Pathfinder Trap";
AIEvent.LIVE_RASTERIZE_COMMAND_PRE =
  "AI Command Notifier: Before Live Rasterize";
AIEvent.LIVE_RASTERIZE_COMMAND_POST =
  "AI Command Notifier: After Live Rasterize";
AIEvent.LIVE_ADOBE_DROP_SHADOW_COMMAND_PRE =
  "AI Command Notifier: Before Live Adobe Drop Shadow";
AIEvent.LIVE_ADOBE_DROP_SHADOW_COMMAND_POST =
  "AI Command Notifier: After Live Adobe Drop Shadow";
AIEvent.LIVE_FEATHER_COMMAND_PRE = "AI Command Notifier: Before Live Feather";
AIEvent.LIVE_FEATHER_COMMAND_POST = "AI Command Notifier: After Live Feather";
AIEvent.LIVE_INNER_GLOW_COMMAND_PRE =
  "AI Command Notifier: Before Live Inner Glow";
AIEvent.LIVE_INNER_GLOW_COMMAND_POST =
  "AI Command Notifier: After Live Inner Glow";
AIEvent.LIVE_OUTER_GLOW_COMMAND_PRE =
  "AI Command Notifier: Before Live Outer Glow";
AIEvent.LIVE_OUTER_GLOW_COMMAND_POST =
  "AI Command Notifier: After Live Outer Glow";
AIEvent.LIVE_ADOBE_ROUND_CORNERS_COMMAND_PRE =
  "AI Command Notifier: Before Live Adobe Round Corners";
AIEvent.LIVE_ADOBE_ROUND_CORNERS_COMMAND_POST =
  "AI Command Notifier: After Live Adobe Round Corners";
AIEvent.LIVE_SCRIBBLE_FILL_COMMAND_PRE =
  "AI Command Notifier: Before Live Scribble Fill";
AIEvent.LIVE_SCRIBBLE_FILL_COMMAND_POST =
  "AI Command Notifier: After Live Scribble Fill";
AIEvent.LIVE_SVG_FILTERS_COMMAND_PRE =
  "AI Command Notifier: Before Live SVG Filters";
AIEvent.LIVE_SVG_FILTERS_COMMAND_POST =
  "AI Command Notifier: After Live SVG Filters";
AIEvent.SVG_FILTER_IMPORT_COMMAND_PRE =
  "AI Command Notifier: Before SVG Filter Import";
AIEvent.SVG_FILTER_IMPORT_COMMAND_POST =
  "AI Command Notifier: After SVG Filter Import";
AIEvent.LIVE_DEFORM_ARC_COMMAND_PRE =
  "AI Command Notifier: Before Live Deform Arc";
AIEvent.LIVE_DEFORM_ARC_COMMAND_POST =
  "AI Command Notifier: After Live Deform Arc";
AIEvent.LIVE_DEFORM_ARC_LOWER_COMMAND_PRE =
  "AI Command Notifier: Before Live Deform Arc Lower";
AIEvent.LIVE_DEFORM_ARC_LOWER_COMMAND_POST =
  "AI Command Notifier: After Live Deform Arc Lower";
AIEvent.LIVE_DEFORM_ARC_UPPER_COMMAND_PRE =
  "AI Command Notifier: Before Live Deform Arc Upper";
AIEvent.LIVE_DEFORM_ARC_UPPER_COMMAND_POST =
  "AI Command Notifier: After Live Deform Arc Upper";
AIEvent.LIVE_DEFORM_ARCH_COMMAND_PRE =
  "AI Command Notifier: Before Live Deform Arch";
AIEvent.LIVE_DEFORM_ARCH_COMMAND_POST =
  "AI Command Notifier: After Live Deform Arch";
AIEvent.LIVE_DEFORM_BULGE_COMMAND_PRE =
  "AI Command Notifier: Before Live Deform Bulge";
AIEvent.LIVE_DEFORM_BULGE_COMMAND_POST =
  "AI Command Notifier: After Live Deform Bulge";
AIEvent.LIVE_DEFORM_SHELL_LOWER_COMMAND_PRE =
  "AI Command Notifier: Before Live Deform Shell Lower";
AIEvent.LIVE_DEFORM_SHELL_LOWER_COMMAND_POST =
  "AI Command Notifier: After Live Deform Shell Lower";
AIEvent.LIVE_DEFORM_SHELL_UPPER_COMMAND_PRE =
  "AI Command Notifier: Before Live Deform Shell Upper";
AIEvent.LIVE_DEFORM_SHELL_UPPER_COMMAND_POST =
  "AI Command Notifier: After Live Deform Shell Upper";
AIEvent.LIVE_DEFORM_FLAG_COMMAND_PRE =
  "AI Command Notifier: Before Live Deform Flag";
AIEvent.LIVE_DEFORM_FLAG_COMMAND_POST =
  "AI Command Notifier: After Live Deform Flag";
AIEvent.LIVE_DEFORM_WAVE_COMMAND_PRE =
  "AI Command Notifier: Before Live Deform Wave";
AIEvent.LIVE_DEFORM_WAVE_COMMAND_POST =
  "AI Command Notifier: After Live Deform Wave";
AIEvent.LIVE_DEFORM_FISH_COMMAND_PRE =
  "AI Command Notifier: Before Live Deform Fish";
AIEvent.LIVE_DEFORM_FISH_COMMAND_POST =
  "AI Command Notifier: After Live Deform Fish";
AIEvent.LIVE_DEFORM_RISE_COMMAND_PRE =
  "AI Command Notifier: Before Live Deform Rise";
AIEvent.LIVE_DEFORM_RISE_COMMAND_POST =
  "AI Command Notifier: After Live Deform Rise";
AIEvent.LIVE_DEFORM_FISHEYE_COMMAND_PRE =
  "AI Command Notifier: Before Live Deform Fisheye";
AIEvent.LIVE_DEFORM_FISHEYE_COMMAND_POST =
  "AI Command Notifier: After Live Deform Fisheye";
AIEvent.LIVE_DEFORM_INFLATE_COMMAND_PRE =
  "AI Command Notifier: Before Live Deform Inflate";
AIEvent.LIVE_DEFORM_INFLATE_COMMAND_POST =
  "AI Command Notifier: After Live Deform Inflate";
AIEvent.LIVE_DEFORM_SQUEEZE_COMMAND_PRE =
  "AI Command Notifier: Before Live Deform Squeeze";
AIEvent.LIVE_DEFORM_SQUEEZE_COMMAND_POST =
  "AI Command Notifier: After Live Deform Squeeze";
AIEvent.LIVE_DEFORM_TWIST_COMMAND_PRE =
  "AI Command Notifier: Before Live Deform Twist";
AIEvent.LIVE_DEFORM_TWIST_COMMAND_POST =
  "AI Command Notifier: After Live Deform Twist";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_G_EFC_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_GEfc";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_G_EFC_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_GEfc";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_CLR_P_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_ClrP";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_CLR_P_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_ClrP";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_CT_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Ct  ";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_CT_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Ct  ";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_DRY_B_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_DryB";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_DRY_B_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_DryB";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_FLM_G_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_FlmG";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_FLM_G_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_FlmG";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_FRSC_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Frsc";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_FRSC_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Frsc";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_N_GLW_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_NGlw";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_N_GLW_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_NGlw";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_PNT_D_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_PntD";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_PNT_D_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_PntD";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_PLT_K_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_PltK";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_PLT_K_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_PltK";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_PLS_W_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_PlsW";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_PLS_W_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_PlsW";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_PST_E_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_PstE";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_PST_E_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_PstE";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_RGH_P_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_RghP";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_RGH_P_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_RghP";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_SMD_S_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_SmdS";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_SMD_S_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_SmdS";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_SPNG_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Spng";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_SPNG_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Spng";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_UNDR_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Undr";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_UNDR_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Undr";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_WTRC_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Wtrc";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_WTRC_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Wtrc";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_GBL_R_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_GblR";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_GBL_R_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_GblR";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_RDL_B_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_RdlB";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_RDL_B_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_RdlB";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_SMR_B_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_SmrB";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_SMR_B_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_SmrB";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_ACC_E_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_AccE";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_ACC_E_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_AccE";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_ANG_S_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_AngS";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_ANG_S_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_AngS";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_CRSH_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Crsh";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_CRSH_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Crsh";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_DRK_S_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_DrkS";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_DRK_S_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_DrkS";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_INK_O_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_InkO";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_INK_O_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_InkO";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_SPT_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Spt ";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_SPT_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Spt ";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_SPR_S_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_SprS";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_SPR_S_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_SprS";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_SMIE_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Smie";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_SMIE_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Smie";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_DFS_G_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_DfsG";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_DFS_G_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_DfsG";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_GLS_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Gls ";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_GLS_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Gls ";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_OCN_R_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_OcnR";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_OCN_R_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_OcnR";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_CLR_H_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_ClrH";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_CLR_H_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_ClrH";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_CRST_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Crst";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_CRST_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Crst";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_MZTN_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Mztn";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_MZTN_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Mztn";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_PNTL_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Pntl";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_PNTL_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Pntl";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_US_MK_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_USMk";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_US_MK_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_USMk";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_BS_RL_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_BsRl";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_BS_RL_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_BsRl";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_CHL_C_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_ChlC";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_CHL_C_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_ChlC";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_CHRC_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Chrc";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_CHRC_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Chrc";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_CHRM_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Chrm";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_CHRM_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Chrm";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_CNT_C_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_CntC";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_CNT_C_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_CntC";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_GRA_P_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_GraP";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_GRA_P_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_GraP";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_HLF_S_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_HlfS";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_HLF_S_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_HlfS";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_NT_PR_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_NtPr";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_NT_PR_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_NtPr";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_PHTC_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Phtc";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_PHTC_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Phtc";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_PLST_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Plst";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_PLST_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Plst";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_RTCL_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Rtcl";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_RTCL_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Rtcl";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_STMP_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Stmp";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_STMP_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Stmp";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_TRN_E_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_TrnE";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_TRN_E_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_TrnE";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_WTR_P_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_WtrP";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_WTR_P_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_WtrP";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_GLW_E_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_GlwE";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_GLW_E_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_GlwE";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_CRQL_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Crql";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_CRQL_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Crql";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_GRN_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Grn ";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_GRN_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Grn ";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_MSC_T_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_MscT";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_MSC_T_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_MscT";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_PTCH_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Ptch";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_PTCH_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Ptch";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_STN_G_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_StnG";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_STN_G_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_StnG";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_TXTZ_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Txtz";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_TXTZ_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Txtz";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_DNTR_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_Dntr";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_DNTR_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_Dntr";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_NTSC_COMMAND_PRE =
  "AI Command Notifier: Before Live PSAdapter_plugin_NTSC";
AIEvent.LIVE_PS_ADAPTER_PLUGIN_NTSC_COMMAND_POST =
  "AI Command Notifier: After Live PSAdapter_plugin_NTSC";
AIEvent.PREVIEW_MODE_COMMAND_PRE = "AI Command Notifier: Before Preview Mode";
AIEvent.PREVIEW_MODE_COMMAND_POST = "AI Command Notifier: After Preview Mode";
AIEvent.INK_PREVIEW_COMMAND_PRE = "AI Command Notifier: Before Ink Preview";
AIEvent.INK_PREVIEW_COMMAND_POST = "AI Command Notifier: After Ink Preview";
AIEvent.PIXEL_VIEW_COMMAND_PRE = "AI Command Notifier: Before Pixel View";
AIEvent.PIXEL_VIEW_COMMAND_POST = "AI Command Notifier: After Pixel View";
AIEvent.PROOF_SETUP_DOCUMENT_COMMAND_PRE =
  "AI Command Notifier: Before Proof Setup Document";
AIEvent.PROOF_SETUP_DOCUMENT_COMMAND_POST =
  "AI Command Notifier: After Proof Setup Document";
AIEvent.PROOF_SETUP_MAC_RGB_COMMAND_PRE =
  "AI Command Notifier: Before Proof Setup Mac RGB";
AIEvent.PROOF_SETUP_MAC_RGB_COMMAND_POST =
  "AI Command Notifier: After Proof Setup Mac RGB";
AIEvent.PROOF_SETUP_WIN_RGB_COMMAND_PRE =
  "AI Command Notifier: Before Proof Setup Win RGB";
AIEvent.PROOF_SETUP_WIN_RGB_COMMAND_POST =
  "AI Command Notifier: After Proof Setup Win RGB";
AIEvent.PROOF_SETUP_MONITOR_RGB_COMMAND_PRE =
  "AI Command Notifier: Before Proof Setup Monitor RGB";
AIEvent.PROOF_SETUP_MONITOR_RGB_COMMAND_POST =
  "AI Command Notifier: After Proof Setup Monitor RGB";
AIEvent.PROOF_SETUP_COLOR_BLIND_P_COMMAND_PRE =
  "AI Command Notifier: Before Proof Setup Color Blind P";
AIEvent.PROOF_SETUP_COLOR_BLIND_P_COMMAND_POST =
  "AI Command Notifier: After Proof Setup Color Blind P";
AIEvent.PROOF_SETUP_COLOR_BLIND_D_COMMAND_PRE =
  "AI Command Notifier: Before Proof Setup Color Blind D";
AIEvent.PROOF_SETUP_COLOR_BLIND_D_COMMAND_POST =
  "AI Command Notifier: After Proof Setup Color Blind D";
AIEvent.PROOF_SETUP_CUSTOM_COMMAND_PRE =
  "AI Command Notifier: Before Proof Setup Custom";
AIEvent.PROOF_SETUP_CUSTOM_COMMAND_POST =
  "AI Command Notifier: After Proof Setup Custom";
AIEvent.PROOF_COLORS_COMMAND_PRE = "AI Command Notifier: Before Proof Colors";
AIEvent.PROOF_COLORS_COMMAND_POST = "AI Command Notifier: After Proof Colors";
AIEvent.ZOOM_IN_COMMAND_PRE = "AI Command Notifier: Before Zoom In";
AIEvent.ZOOM_IN_COMMAND_POST = "AI Command Notifier: After Zoom In";
AIEvent.ZOOM_OUT_COMMAND_PRE = "AI Command Notifier: Before Zoom Out";
AIEvent.ZOOM_OUT_COMMAND_POST = "AI Command Notifier: After Zoom Out";
AIEvent.REDUCE_TO_FIT_COMMAND_PRE = "AI Command Notifier: Before Reduce To Fit";
AIEvent.REDUCE_TO_FIT_COMMAND_POST = "AI Command Notifier: After Reduce To Fit";
AIEvent.REDUCE_TO_FIT_ALL_COMMAND_PRE =
  "AI Command Notifier: Before Reduce To Fit All";
AIEvent.REDUCE_TO_FIT_ALL_COMMAND_POST =
  "AI Command Notifier: After Reduce To Fit All";
AIEvent.ACTUAL_SIZE_COMMAND_PRE = "AI Command Notifier: Before Actual Size";
AIEvent.ACTUAL_SIZE_COMMAND_POST = "AI Command Notifier: After Actual Size";
AIEvent.SHOW_HIDE_EDGES_COMMAND_PRE =
  "AI Command Notifier: Before Show/Hide Edges";
AIEvent.SHOW_HIDE_EDGES_COMMAND_POST =
  "AI Command Notifier: After Show/Hide Edges";
AIEvent.SHOW_HIDE_ARTBOARD_COMMAND_PRE =
  "AI Command Notifier: Before Show/Hide Artboard";
AIEvent.SHOW_HIDE_ARTBOARD_COMMAND_POST =
  "AI Command Notifier: After Show/Hide Artboard";
AIEvent.SHOW_HIDE_PAGE_TILING_COMMAND_PRE =
  "AI Command Notifier: Before Show/Hide Page Tiling";
AIEvent.SHOW_HIDE_PAGE_TILING_COMMAND_POST =
  "AI Command Notifier: After Show/Hide Page Tiling";
AIEvent.AI_SLICE_FEEDBACK_MENU_COMMAND_PRE =
  "AI Command Notifier: Before AISlice Feedback Menu";
AIEvent.AI_SLICE_FEEDBACK_MENU_COMMAND_POST =
  "AI Command Notifier: After AISlice Feedback Menu";
AIEvent.AI_SLICE_LOCK_MENU_COMMAND_PRE =
  "AI Command Notifier: Before AISlice Lock Menu";
AIEvent.AI_SLICE_LOCK_MENU_COMMAND_POST =
  "AI Command Notifier: After AISlice Lock Menu";
AIEvent.SHOW_HIDE_TEMPLATE_COMMAND_PRE =
  "AI Command Notifier: Before Show/Hide Template";
AIEvent.SHOW_HIDE_TEMPLATE_COMMAND_POST =
  "AI Command Notifier: After Show/Hide Template";
AIEvent.SHOW_HIDE_RULERS_COMMAND_PRE =
  "AI Command Notifier: Before Show/Hide Rulers";
AIEvent.SHOW_HIDE_RULERS_COMMAND_POST =
  "AI Command Notifier: After Show/Hide Rulers";
AIEvent.SWITCH_RULER_COORDINATE_SYSTEM_COMMAND_PRE =
  "AI Command Notifier: Before Switch Ruler Coordinate System";
AIEvent.SWITCH_RULER_COORDINATE_SYSTEM_COMMAND_POST =
  "AI Command Notifier: After Switch Ruler Coordinate System";
AIEvent.SHOW_HIDE_VIDEO_RULERS_COMMAND_PRE =
  "AI Command Notifier: Before Show/Hide Video Rulers";
AIEvent.SHOW_HIDE_VIDEO_RULERS_COMMAND_POST =
  "AI Command Notifier: After Show/Hide Video Rulers";
AIEvent.AI_BOUNDING_BOX_TOGGLE_COMMAND_PRE =
  "AI Command Notifier: Before AI Bounding Box Toggle";
AIEvent.AI_BOUNDING_BOX_TOGGLE_COMMAND_POST =
  "AI Command Notifier: After AI Bounding Box Toggle";
AIEvent.TRANSPARENCY_GRID_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before TransparencyGrid Menu Item";
AIEvent.TRANSPARENCY_GRID_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After TransparencyGrid Menu Item";
AIEvent.SHOW_HIDE_TEXT_THREADS_COMMAND_PRE =
  "AI Command Notifier: Before Show/Hide Text Threads";
AIEvent.SHOW_HIDE_TEXT_THREADS_COMMAND_POST =
  "AI Command Notifier: After Show/Hide Text Threads";
AIEvent.GRADIENT_FEEDBACK_COMMAND_PRE =
  "AI Command Notifier: Before Gradient Feedback";
AIEvent.GRADIENT_FEEDBACK_COMMAND_POST =
  "AI Command Notifier: After Gradient Feedback";
AIEvent.SHOW_GAPS_PLANET_X_COMMAND_PRE =
  "AI Command Notifier: Before Show Gaps Planet X";
AIEvent.SHOW_GAPS_PLANET_X_COMMAND_POST =
  "AI Command Notifier: After Show Gaps Planet X";
AIEvent.SHOW_HIDE_GUIDES_COMMAND_PRE =
  "AI Command Notifier: Before Show/Hide Guides";
AIEvent.SHOW_HIDE_GUIDES_COMMAND_POST =
  "AI Command Notifier: After Show/Hide Guides";
AIEvent.LOCK_UNLOCK_GUIDES_COMMAND_PRE =
  "AI Command Notifier: Before Lock/Unlock Guides";
AIEvent.LOCK_UNLOCK_GUIDES_COMMAND_POST =
  "AI Command Notifier: After Lock/Unlock Guides";
AIEvent.MAKE_GUIDES_COMMAND_PRE = "AI Command Notifier: Before Make Guides";
AIEvent.MAKE_GUIDES_COMMAND_POST = "AI Command Notifier: After Make Guides";
AIEvent.RELEASE_GUIDES_COMMAND_PRE =
  "AI Command Notifier: Before Release Guides";
AIEvent.RELEASE_GUIDES_COMMAND_POST =
  "AI Command Notifier: After Release Guides";
AIEvent.CLEAR_GUIDE_COMMAND_PRE = "AI Command Notifier: Before Clear Guide";
AIEvent.CLEAR_GUIDE_COMMAND_POST = "AI Command Notifier: After Clear Guide";
AIEvent.SNAPOMATIC_ON_OFF_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Snapomatic on-off menu item";
AIEvent.SNAPOMATIC_ON_OFF_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Snapomatic on-off menu item";
AIEvent.SHOW_PERSPECTIVE_GRID_COMMAND_PRE =
  "AI Command Notifier: Before Show Perspective Grid";
AIEvent.SHOW_PERSPECTIVE_GRID_COMMAND_POST =
  "AI Command Notifier: After Show Perspective Grid";
AIEvent.SHOW_RULER_COMMAND_PRE = "AI Command Notifier: Before Show Ruler";
AIEvent.SHOW_RULER_COMMAND_POST = "AI Command Notifier: After Show Ruler";
AIEvent.SNAP_TO_GRID_COMMAND_PRE = "AI Command Notifier: Before Snap to Grid";
AIEvent.SNAP_TO_GRID_COMMAND_POST = "AI Command Notifier: After Snap to Grid";
AIEvent.LOCK_PERSPECTIVE_GRID_COMMAND_PRE =
  "AI Command Notifier: Before Lock Perspective Grid";
AIEvent.LOCK_PERSPECTIVE_GRID_COMMAND_POST =
  "AI Command Notifier: After Lock Perspective Grid";
AIEvent.LOCK_STATION_POINT_COMMAND_PRE =
  "AI Command Notifier: Before Lock Station Point";
AIEvent.LOCK_STATION_POINT_COMMAND_POST =
  "AI Command Notifier: After Lock Station Point";
AIEvent.DEFINE_PERSPECTIVE_GRID_COMMAND_PRE =
  "AI Command Notifier: Before Define Perspective Grid";
AIEvent.DEFINE_PERSPECTIVE_GRID_COMMAND_POST =
  "AI Command Notifier: After Define Perspective Grid";
AIEvent.SAVE_PERSPECTIVE_GRID_AS_PRESET_COMMAND_PRE =
  "AI Command Notifier: Before Save Perspective Grid as Preset";
AIEvent.SAVE_PERSPECTIVE_GRID_AS_PRESET_COMMAND_POST =
  "AI Command Notifier: After Save Perspective Grid as Preset";
AIEvent.SHOW_HIDE_GRID_COMMAND_PRE =
  "AI Command Notifier: Before Show/Hide Grid";
AIEvent.SHOW_HIDE_GRID_COMMAND_POST =
  "AI Command Notifier: After Show/Hide Grid";
AIEvent.ENABLE_DISABLE_GRID_SNAP_COMMAND_PRE =
  "AI Command Notifier: Before Enable/Disable Grid Snap";
AIEvent.ENABLE_DISABLE_GRID_SNAP_COMMAND_POST =
  "AI Command Notifier: After Enable/Disable Grid Snap";
AIEvent.SNAP_POINT_COMMAND_PRE = "AI Command Notifier: Before Snap Point";
AIEvent.SNAP_POINT_COMMAND_POST = "AI Command Notifier: After Snap Point";
AIEvent.NEW_VIEW_SNAP_COMMAND_PRE = "AI Command Notifier: Before New View Snap";
AIEvent.NEW_VIEW_SNAP_COMMAND_POST = "AI Command Notifier: After New View Snap";
AIEvent.EDIT_VIEW_SNAP_COMMAND_PRE =
  "AI Command Notifier: Before Edit View Snap";
AIEvent.EDIT_VIEW_SNAP_COMMAND_POST =
  "AI Command Notifier: After Edit View Snap";
AIEvent.VIEW1_COMMAND_PRE = "AI Command Notifier: Before View1";
AIEvent.VIEW1_COMMAND_POST = "AI Command Notifier: After View1";
AIEvent.VIEW2_COMMAND_PRE = "AI Command Notifier: Before View2";
AIEvent.VIEW2_COMMAND_POST = "AI Command Notifier: After View2";
AIEvent.VIEW3_COMMAND_PRE = "AI Command Notifier: Before View3";
AIEvent.VIEW3_COMMAND_POST = "AI Command Notifier: After View3";
AIEvent.VIEW4_COMMAND_PRE = "AI Command Notifier: Before View4";
AIEvent.VIEW4_COMMAND_POST = "AI Command Notifier: After View4";
AIEvent.VIEW5_COMMAND_PRE = "AI Command Notifier: Before View5";
AIEvent.VIEW5_COMMAND_POST = "AI Command Notifier: After View5";
AIEvent.VIEW6_COMMAND_PRE = "AI Command Notifier: Before View6";
AIEvent.VIEW6_COMMAND_POST = "AI Command Notifier: After View6";
AIEvent.VIEW7_COMMAND_PRE = "AI Command Notifier: Before View7";
AIEvent.VIEW7_COMMAND_POST = "AI Command Notifier: After View7";
AIEvent.VIEW8_COMMAND_PRE = "AI Command Notifier: Before View8";
AIEvent.VIEW8_COMMAND_POST = "AI Command Notifier: After View8";
AIEvent.VIEW9_COMMAND_PRE = "AI Command Notifier: Before View9";
AIEvent.VIEW9_COMMAND_POST = "AI Command Notifier: After View9";
AIEvent.VIEW10_COMMAND_PRE = "AI Command Notifier: Before View10";
AIEvent.VIEW10_COMMAND_POST = "AI Command Notifier: After View10";
AIEvent.NEW_VIEW_COMMAND_PRE = "AI Command Notifier: Before New View";
AIEvent.NEW_VIEW_COMMAND_POST = "AI Command Notifier: After New View";
AIEvent.ARRANGE_WINDOWS_CASCADE_COMMAND_PRE =
  "AI Command Notifier: Before Arrange Windows - Cascade";
AIEvent.ARRANGE_WINDOWS_CASCADE_COMMAND_POST =
  "AI Command Notifier: After Arrange Windows - Cascade";
AIEvent.ARRANGE_WINDOWS_VERTICAL_COMMAND_PRE =
  "AI Command Notifier: Before Arrange Windows - Vertical";
AIEvent.ARRANGE_WINDOWS_VERTICAL_COMMAND_POST =
  "AI Command Notifier: After Arrange Windows - Vertical";
AIEvent.ARRANGE_WINDOWS_FLOAT_IN_WINDOW_COMMAND_PRE =
  "AI Command Notifier: Before Arrange Windows - Float in Window";
AIEvent.ARRANGE_WINDOWS_FLOAT_IN_WINDOW_COMMAND_POST =
  "AI Command Notifier: After Arrange Windows - Float in Window";
AIEvent.ARRANGE_WINDOWS_FLOAT_ALL_IN_WINDOWS_COMMAND_PRE =
  "AI Command Notifier: Before Arrange Windows - Float All in Windows";
AIEvent.ARRANGE_WINDOWS_FLOAT_ALL_IN_WINDOWS_COMMAND_POST =
  "AI Command Notifier: After Arrange Windows - Float All in Windows";
AIEvent.ARRANGE_WINDOWS_CONSOLIDATE_ALL_WINDOWS_COMMAND_PRE =
  "AI Command Notifier: Before Arrange Windows - Consolidate AllWindows";
AIEvent.ARRANGE_WINDOWS_CONSOLIDATE_ALL_WINDOWS_COMMAND_POST =
  "AI Command Notifier: After Arrange Windows - Consolidate AllWindows";
AIEvent.ADOBE_SAVE_WORKSPACE_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Save Workspace";
AIEvent.ADOBE_SAVE_WORKSPACE_COMMAND_POST =
  "AI Command Notifier: After Adobe Save Workspace";
AIEvent.ADOBE_MANAGE_WORKSPACE_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Manage Workspace";
AIEvent.ADOBE_MANAGE_WORKSPACE_COMMAND_POST =
  "AI Command Notifier: After Adobe Manage Workspace";
AIEvent.CONTROL_PALETTE_PLUGIN_COMMAND_PRE =
  "AI Command Notifier: Before control palette plugin";
AIEvent.CONTROL_PALETTE_PLUGIN_COMMAND_POST =
  "AI Command Notifier: After control palette plugin";
AIEvent.ADOBE_BUILT_IN_TOOLBOX1_COMMAND_PRE =
  "AI Command Notifier: Before AdobeBuiltInToolbox1";
AIEvent.ADOBE_BUILT_IN_TOOLBOX1_COMMAND_POST =
  "AI Command Notifier: After AdobeBuiltInToolbox1";
AIEvent.ADOBE_ACTION_PALETTE_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Action Palette";
AIEvent.ADOBE_ACTION_PALETTE_COMMAND_POST =
  "AI Command Notifier: After Adobe Action Palette";
AIEvent.ADOBE_ALIGN_OBJECTS2_COMMAND_PRE =
  "AI Command Notifier: Before AdobeAlignObjects2";
AIEvent.ADOBE_ALIGN_OBJECTS2_COMMAND_POST =
  "AI Command Notifier: After AdobeAlignObjects2";
AIEvent.STYLE_PALETTE_COMMAND_PRE = "AI Command Notifier: Before Style Palette";
AIEvent.STYLE_PALETTE_COMMAND_POST = "AI Command Notifier: After Style Palette";
AIEvent.ADOBE_ARTBOARD_PALETTE_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Artboard Palette";
AIEvent.ADOBE_ARTBOARD_PALETTE_COMMAND_POST =
  "AI Command Notifier: After Adobe Artboard Palette";
AIEvent.INTERNAL_PALETTES_POSING_AS_PLUG_IN_MENUS_ATTRIBUTES_COMMAND_PRE =
  "AI Command Notifier: Before internal palettes posing as plug-in menus-attributes";
AIEvent.INTERNAL_PALETTES_POSING_AS_PLUG_IN_MENUS_ATTRIBUTES_COMMAND_POST =
  "AI Command Notifier: After internal palettes posing as plug-in menus-attributes";
AIEvent.ADOBE_BRUSH_MANAGER_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Adobe BrushManager Menu Item";
AIEvent.ADOBE_BRUSH_MANAGER_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Adobe BrushManager Menu Item";
AIEvent.ADOBE_COLOR_PALETTE_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Color Palette";
AIEvent.ADOBE_COLOR_PALETTE_COMMAND_POST =
  "AI Command Notifier: After Adobe Color Palette";
AIEvent.ADOBE_HARMONY_PALETTE_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Harmony Palette";
AIEvent.ADOBE_HARMONY_PALETTE_COMMAND_POST =
  "AI Command Notifier: After Adobe Harmony Palette";
AIEvent.DOC_INFO1_COMMAND_PRE = "AI Command Notifier: Before DocInfo1";
AIEvent.DOC_INFO1_COMMAND_POST = "AI Command Notifier: After DocInfo1";
AIEvent.ADOBE_FLATTENING_PREVIEW_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Flattening Preview";
AIEvent.ADOBE_FLATTENING_PREVIEW_COMMAND_POST =
  "AI Command Notifier: After Adobe Flattening Preview";
AIEvent.ADOBE_GRADIENT_PALETTE_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Gradient Palette";
AIEvent.ADOBE_GRADIENT_PALETTE_COMMAND_POST =
  "AI Command Notifier: After Adobe Gradient Palette";
AIEvent.ADOBE_STYLE_PALETTE_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Style Palette";
AIEvent.ADOBE_STYLE_PALETTE_COMMAND_POST =
  "AI Command Notifier: After Adobe Style Palette";
AIEvent.INTERNAL_PALETTES_POSING_AS_PLUG_IN_MENUS_INFO_COMMAND_PRE =
  "AI Command Notifier: Before internal palettes posing as plug-in menus-info";
AIEvent.INTERNAL_PALETTES_POSING_AS_PLUG_IN_MENUS_INFO_COMMAND_POST =
  "AI Command Notifier: After internal palettes posing as plug-in menus-info";
AIEvent.ADOBE_LAYER_PALETTE1_COMMAND_PRE =
  "AI Command Notifier: Before AdobeLayerPalette1";
AIEvent.ADOBE_LAYER_PALETTE1_COMMAND_POST =
  "AI Command Notifier: After AdobeLayerPalette1";
AIEvent.ADOBE_LINK_PALETTE_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Adobe LinkPalette Menu Item";
AIEvent.ADOBE_LINK_PALETTE_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Adobe LinkPalette Menu Item";
AIEvent.AI_MAGIC_WAND_COMMAND_PRE = "AI Command Notifier: Before AI Magic Wand";
AIEvent.AI_MAGIC_WAND_COMMAND_POST = "AI Command Notifier: After AI Magic Wand";
AIEvent.ADOBE_NAVIGATOR1_COMMAND_PRE =
  "AI Command Notifier: Before AdobeNavigator1";
AIEvent.ADOBE_NAVIGATOR1_COMMAND_POST =
  "AI Command Notifier: After AdobeNavigator1";
AIEvent.ADOBE_PATHFINDER_PALETTE1_COMMAND_PRE =
  "AI Command Notifier: Before AdobePathfinderPalette1";
AIEvent.ADOBE_PATHFINDER_PALETTE1_COMMAND_POST =
  "AI Command Notifier: After AdobePathfinderPalette1";
AIEvent.ADOBE_SEPARATION_PREVIEW_PALETTE_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Separation Preview Palette";
AIEvent.ADOBE_SEPARATION_PREVIEW_PALETTE_COMMAND_POST =
  "AI Command Notifier: After Adobe Separation Preview Palette";
AIEvent.ADOBE_STROKE_PALETTE_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Stroke Palette";
AIEvent.ADOBE_STROKE_PALETTE_COMMAND_POST =
  "AI Command Notifier: After Adobe Stroke Palette";
AIEvent.ADOBE_SVG_INTERACTIVITY_PALETTE_COMMAND_PRE =
  "AI Command Notifier: Before Adobe SVG Interactivity Palette";
AIEvent.ADOBE_SVG_INTERACTIVITY_PALETTE_COMMAND_POST =
  "AI Command Notifier: After Adobe SVG Interactivity Palette";
AIEvent.ADOBE_SWATCHES_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Swatches Menu Item";
AIEvent.ADOBE_SWATCHES_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Adobe Swatches Menu Item";
AIEvent.ADOBE_SYMBOL_PALETTE_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Symbol Palette";
AIEvent.ADOBE_SYMBOL_PALETTE_COMMAND_POST =
  "AI Command Notifier: After Adobe Symbol Palette";
AIEvent.ADOBE_TRANSFORM_OBJECTS1_COMMAND_PRE =
  "AI Command Notifier: Before AdobeTransformObjects1";
AIEvent.ADOBE_TRANSFORM_OBJECTS1_COMMAND_POST =
  "AI Command Notifier: After AdobeTransformObjects1";
AIEvent.ADOBE_TRANSPARENCY_PALETTE_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Transparency Palette Menu Item";
AIEvent.ADOBE_TRANSPARENCY_PALETTE_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Adobe Transparency Palette Menu Item";
AIEvent.INTERNAL_PALETTES_POSING_AS_PLUG_IN_MENUS_CHARACTER_COMMAND_PRE =
  "AI Command Notifier: Before internal palettes posing as plug-in menus-character";
AIEvent.INTERNAL_PALETTES_POSING_AS_PLUG_IN_MENUS_CHARACTER_COMMAND_POST =
  "AI Command Notifier: After internal palettes posing as plug-in menus-character";
AIEvent.CHARACTER_STYLES_COMMAND_PRE =
  "AI Command Notifier: Before Character Styles";
AIEvent.CHARACTER_STYLES_COMMAND_POST =
  "AI Command Notifier: After Character Styles";
AIEvent.FLASH_TEXT_COMMAND_PRE = "AI Command Notifier: Before Flash Text";
AIEvent.FLASH_TEXT_COMMAND_POST = "AI Command Notifier: After Flash Text";
AIEvent.ALTERNATE_GLYPH_PALETTE_PLUGIN2_COMMAND_PRE =
  "AI Command Notifier: Before alternate glyph palette plugin 2";
AIEvent.ALTERNATE_GLYPH_PALETTE_PLUGIN2_COMMAND_POST =
  "AI Command Notifier: After alternate glyph palette plugin 2";
AIEvent.INTERNAL_PALETTES_POSING_AS_PLUG_IN_MENUS_OPENTYPE_COMMAND_PRE =
  "AI Command Notifier: Before internal palettes posing as plug-in menus-opentype";
AIEvent.INTERNAL_PALETTES_POSING_AS_PLUG_IN_MENUS_OPENTYPE_COMMAND_POST =
  "AI Command Notifier: After internal palettes posing as plug-in menus-opentype";
AIEvent.INTERNAL_PALETTES_POSING_AS_PLUG_IN_MENUS_PARAGRAPH_COMMAND_PRE =
  "AI Command Notifier: Before internal palettes posing as plug-in menus-paragraph";
AIEvent.INTERNAL_PALETTES_POSING_AS_PLUG_IN_MENUS_PARAGRAPH_COMMAND_POST =
  "AI Command Notifier: After internal palettes posing as plug-in menus-paragraph";
AIEvent.ADOBE_PARAGRAPH_STYLES_PALETTE_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Paragraph Styles Palette";
AIEvent.ADOBE_PARAGRAPH_STYLES_PALETTE_COMMAND_POST =
  "AI Command Notifier: After Adobe Paragraph Styles Palette";
AIEvent.INTERNAL_PALETTES_POSING_AS_PLUG_IN_MENUS_TAB_COMMAND_PRE =
  "AI Command Notifier: Before internal palettes posing as plug-in menus-tab";
AIEvent.INTERNAL_PALETTES_POSING_AS_PLUG_IN_MENUS_TAB_COMMAND_POST =
  "AI Command Notifier: After internal palettes posing as plug-in menus-tab";
AIEvent.ADOBE_VARIABLES_PALETTE_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Adobe Variables Palette Menu Item";
AIEvent.ADOBE_VARIABLES_PALETTE_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Adobe Variables Palette Menu Item";
AIEvent.WELCOME_SCREEN_MENU_ITEM_COMMAND_PRE =
  "AI Command Notifier: Before Welcome screen menu item";
AIEvent.WELCOME_SCREEN_MENU_ITEM_COMMAND_POST =
  "AI Command Notifier: After Welcome screen menu item";
AIEvent.ABOUT_ILLUSTRATOR_COMMAND_PRE =
  "AI Command Notifier: Before About Illustrator";
AIEvent.ABOUT_ILLUSTRATOR_COMMAND_POST =
  "AI Command Notifier: After About Illustrator";
AIEvent.SYSTEM_INFORMATION_COMMAND_PRE =
  "AI Command Notifier: Before System Information";
AIEvent.SYSTEM_INFORMATION_COMMAND_POST =
  "AI Command Notifier: After System Information";
AIEvent.TEXT_SIZE_COMMAND_PRE = "AI Command Notifier: Before Text Size";
AIEvent.TEXT_SIZE_COMMAND_POST = "AI Command Notifier: After Text Size";
AIEvent.TEXT_ALIGNMENT_COMMAND_PRE =
  "AI Command Notifier: Before Text Alignment";
AIEvent.TEXT_ALIGNMENT_COMMAND_POST =
  "AI Command Notifier: After Text Alignment";
AIEvent.TRACKING_KERNING_COMMAND_PRE =
  "AI Command Notifier: Before Tracking/Kerning";
AIEvent.TRACKING_KERNING_COMMAND_POST =
  "AI Command Notifier: After Tracking/Kerning";
AIEvent.WORD_SPACING_COMMAND_PRE = "AI Command Notifier: Before Word Spacing";
AIEvent.WORD_SPACING_COMMAND_POST = "AI Command Notifier: After Word Spacing";
AIEvent.DISCRETIONARY_HYPHEN_COMMAND_PRE =
  "AI Command Notifier: Before Discretionary Hyphen";
AIEvent.DISCRETIONARY_HYPHEN_COMMAND_POST =
  "AI Command Notifier: After Discretionary Hyphen";
AIEvent.CLEAR_TRACK_COMMAND_PRE = "AI Command Notifier: Before Clear Track";
AIEvent.CLEAR_TRACK_COMMAND_POST = "AI Command Notifier: After Clear Track";
AIEvent.CLEAR_TYPE_SCALE_COMMAND_PRE =
  "AI Command Notifier: Before Clear Type Scale";
AIEvent.CLEAR_TYPE_SCALE_COMMAND_POST =
  "AI Command Notifier: After Clear Type Scale";
AIEvent.HIGHLIGHT_FONT_COMMAND_PRE =
  "AI Command Notifier: Before Highlight Font";
AIEvent.HIGHLIGHT_FONT_COMMAND_POST =
  "AI Command Notifier: After Highlight Font";
AIEvent.CENTER_ALIGN_COMMAND_PRE = "AI Command Notifier: Before Center Align";
AIEvent.CENTER_ALIGN_COMMAND_POST = "AI Command Notifier: After Center Align";
AIEvent.RIGHT_ALIGN_COMMAND_PRE = "AI Command Notifier: Before Right Align";
AIEvent.RIGHT_ALIGN_COMMAND_POST = "AI Command Notifier: After Right Align";
AIEvent.JUSTIFY_COMMAND_PRE = "AI Command Notifier: Before Justify";
AIEvent.JUSTIFY_COMMAND_POST = "AI Command Notifier: After Justify";
AIEvent.JUSTIFY_CENTER_COMMAND_PRE =
  "AI Command Notifier: Before Justify Center";
AIEvent.JUSTIFY_CENTER_COMMAND_POST =
  "AI Command Notifier: After Justify Center";
AIEvent.JUSTIFY_RIGHT_COMMAND_PRE = "AI Command Notifier: Before Justify Right";
AIEvent.JUSTIFY_RIGHT_COMMAND_POST = "AI Command Notifier: After Justify Right";
AIEvent.JUSTIFY_ALL_COMMAND_PRE = "AI Command Notifier: Before Justify All";
AIEvent.JUSTIFY_ALL_COMMAND_POST = "AI Command Notifier: After Justify All";
AIEvent.TOGGLE_AUTO_HYPHENATION_COMMAND_PRE =
  "AI Command Notifier: Before Toggle Auto Hyphenation";
AIEvent.TOGGLE_AUTO_HYPHENATION_COMMAND_POST =
  "AI Command Notifier: After Toggle Auto Hyphenation";
AIEvent.TOGGLE_LINE_COMPOSER_COMMAND_PRE =
  "AI Command Notifier: Before Toggle Line Composer";
AIEvent.TOGGLE_LINE_COMPOSER_COMMAND_POST =
  "AI Command Notifier: After Toggle Line Composer";
AIEvent.SWITCH_SELECTION_TOOL_COMMAND_PRE =
  "AI Command Notifier: Before Switch Selection Tool";
AIEvent.SWITCH_SELECTION_TOOL_COMMAND_POST =
  "AI Command Notifier: After Switch Selection Tool";
AIEvent.PAGE_SETUP_COMMAND_PRE = "AI Command Notifier: Before Page Setup";
AIEvent.PAGE_SETUP_COMMAND_POST = "AI Command Notifier: After Page Setup";
AIEvent.UNLINK_TEXT_COMMAND_PRE = "AI Command Notifier: Before Unlink Text";
AIEvent.UNLINK_TEXT_COMMAND_POST = "AI Command Notifier: After Unlink Text";
AIEvent.ARTWORK_MODE_COMMAND_PRE = "AI Command Notifier: Before Artwork Mode";
AIEvent.ARTWORK_MODE_COMMAND_POST = "AI Command Notifier: After Artwork Mode";
AIEvent.SHOW_HIDE_ARTBOARD_RULERS_COMMAND_PRE =
  "AI Command Notifier: Before Show/Hide Artboard Rulers";
AIEvent.SHOW_HIDE_ARTBOARD_RULERS_COMMAND_POST =
  "AI Command Notifier: After Show/Hide Artboard Rulers";
AIEvent.SELECT_WINDOW_COMMAND_PRE = "AI Command Notifier: Before Select Window";
AIEvent.SELECT_WINDOW_COMMAND_POST = "AI Command Notifier: After Select Window";
AIEvent.TEXT_FONT_COMMAND_PRE = "AI Command Notifier: Before Text Font";
AIEvent.TEXT_FONT_COMMAND_POST = "AI Command Notifier: After Text Font";
AIEvent.LINK_TEXT_COMMAND_PRE = "AI Command Notifier: Before Link Text";
AIEvent.LINK_TEXT_COMMAND_POST = "AI Command Notifier: After Link Text";
AIEvent.LINE_SPACING_COMMAND_PRE = "AI Command Notifier: Before Line Spacing";
AIEvent.LINE_SPACING_COMMAND_POST = "AI Command Notifier: After Line Spacing";
AIEvent.RELEASE_CROP_MARKS_COMMAND_PRE =
  "AI Command Notifier: Before Release Crop Marks";
AIEvent.RELEASE_CROP_MARKS_COMMAND_POST =
  "AI Command Notifier: After Release Crop Marks";
AIEvent.NEW_MULTIPLE_MASTER_INSTANCE_COMMAND_PRE =
  "AI Command Notifier: Before New Multiple Master Instance";
AIEvent.NEW_MULTIPLE_MASTER_INSTANCE_COMMAND_POST =
  "AI Command Notifier: After New Multiple Master Instance";
AIEvent.CUT_PICTURE_COMMAND_PRE = "AI Command Notifier: Before Cut Picture";
AIEvent.CUT_PICTURE_COMMAND_POST = "AI Command Notifier: After Cut Picture";
AIEvent.COPY_PICTURE_COMMAND_PRE = "AI Command Notifier: Before Copy Picture";
AIEvent.COPY_PICTURE_COMMAND_POST = "AI Command Notifier: After Copy Picture";
AIEvent.SET_NOTE_COMMAND_PRE = "AI Command Notifier: Before Set Note";
AIEvent.SET_NOTE_COMMAND_POST = "AI Command Notifier: After Set Note";
AIEvent.SEPARATION_SETUP_COMMAND_PRE =
  "AI Command Notifier: Before Separation Setup";
AIEvent.SEPARATION_SETUP_COMMAND_POST =
  "AI Command Notifier: After Separation Setup";
AIEvent.ARRANGE_WINDOWS_HORIZONTAL_COMMAND_PRE =
  "AI Command Notifier: Before Arrange Windows - Horizontal";
AIEvent.ARRANGE_WINDOWS_HORIZONTAL_COMMAND_POST =
  "AI Command Notifier: After Arrange Windows - Horizontal";
AIEvent.ARRANGE_ICONS_COMMAND_PRE = "AI Command Notifier: Before Arrange Icons";
AIEvent.ARRANGE_ICONS_COMMAND_POST = "AI Command Notifier: After Arrange Icons";
AIEvent.SELECTE_FILE1_COMMAND_PRE =
  "AI Command Notifier: Before Selecte File 1";
AIEvent.SELECTE_FILE1_COMMAND_POST =
  "AI Command Notifier: After Selecte File 1";
AIEvent.SELECTE_FILE2_COMMAND_PRE =
  "AI Command Notifier: Before Selecte File 2";
AIEvent.SELECTE_FILE2_COMMAND_POST =
  "AI Command Notifier: After Selecte File 2";
AIEvent.SELECTE_FILE3_COMMAND_PRE =
  "AI Command Notifier: Before Selecte File 3";
AIEvent.SELECTE_FILE3_COMMAND_POST =
  "AI Command Notifier: After Selecte File 3";
AIEvent.SELECTE_FILE4_COMMAND_PRE =
  "AI Command Notifier: Before Selecte File 4";
AIEvent.SELECTE_FILE4_COMMAND_POST =
  "AI Command Notifier: After Selecte File 4";
AIEvent.TEXT_ORIENTATION_COMMAND_PRE =
  "AI Command Notifier: Before Text Orientation";
AIEvent.TEXT_ORIENTATION_COMMAND_POST =
  "AI Command Notifier: After Text Orientation";
AIEvent.GLYPH_SUBSTITUTION_OPTIONS_COMMAND_PRE =
  "AI Command Notifier: Before Glyph Substitution Options";
AIEvent.GLYPH_SUBSTITUTION_OPTIONS_COMMAND_POST =
  "AI Command Notifier: After Glyph Substitution Options";
AIEvent.AFTER_ALT_OPTION_DRAG_COPY_COMMAND_POST =
  "AI Command Notifier: After Alt/Option Drag Copy";

/**
 *  Object sets are deprecated in favor of dictionaries, see AIDictionarySuite
 */

AIEvent.OBJECT_SET_CHANGED = "AI Object Set Changed Notifier";

/**
 *  Object sets are deprecated in favor of dictionaries, see AIDictionarySuite
 */

AIEvent.REPLACE_COLOR = "AI Replace Color Notifier";

/**
 *  The eyedropper sends this while tracking a mouse drag, to notify the Color palette to update its proxies during the drag, using the path style and map in the AIUpdatePathStyleNotifyData. See AIPaintStyleSuite
 */

AIEvent.UPDATE_PATH_STYLE = "AI Update PathStyle Notifier";

/**
 *  See AIPaintStyleSuite
 */

AIEvent.PAINT_STYLE_FILL_STROKE_CHANGED =
  "AI Paint Style Fill Stroke Changed Notifier";

/**
 *  See AIPaintStyleSuite
 */

AIEvent.PAINT_STYLE_GRADIENT_STOP_CHANGED =
  "AI Paint Style Gradient Stop Changed Notifier";

/**
 *  See AIPathStyleSuite
 */

AIEvent.BEGIN_IMPORT_STYLES = "AI Begin Import Styles Notifier";

/**
 *  See AIPathStyleSuite
 */

AIEvent.END_IMPORT_STYLES = "AI End Import Styles Notifier";

/**
 *  See AIPatternSuite
 */

AIEvent.ART_PATTERN_CHANGED = "AI Art Pattern Changed Notifier";

/**
 *  Sent when perspective grid parameters are changed.
 */

AIEvent.PERSPECTIVE_PARAMS_CHANGED =
  "AI Perspective Parameters Changed Notifier";

/**
 *  Sent when perspective grid visibility is changed.
 */

AIEvent.PERSPECTIVE_GRID_VISIBILITY_CHANGED =
  "AI Perspective Grid Visibility Changed Notifier";

/**
 *  Sent after all plug-ins have received and processed kAIApplicationStartedNotifier.
 */

AIEvent.ALL_PLUGIN_STARTED = "AI All Plug-ins Started Notifier";

/**
 *  Sent before Illustrator sends the application-stopped notifier.
 */

AIEvent.PLUGIN_STOPPING = "AI All Plug-ins Stopping Notifier";

/**
 *  Sent when a change is made to the preferences. See AIPreferenceSuite
 */

AIEvent.PREFERENCE_CHANGED = "AI Preference Changed Notifier";

/**
 *  Your plug-in can subscribe to this notifier when it receives the startup selector. It receives the notification only once, when the application has completed the startup process. This provides an opportunity to perform additional setup operations such as restoring plug-in window positions and visibility, or operations that depend on suites unavailable at an earlier time.
 */

AIEvent.APPLICATION_STARTED = "AI Application Started Notifier";

/**
 *  Sent at application shutdown, allows you to clean up private data. See AIRuntimeSuite.
 */

AIEvent.APPLICATION_SHUTDOWN = "AI Application Shutdown Notifier";

/**
 *  See AISlicingSuite
 */

AIEvent.SLICING_CHANGED = "AI Slicing Changed";

/**
 *  See AISVGFilterSuite
 */

AIEvent.SVG_FILTER_CHANGED = "AI SVG Filter Changed Notifier";

/**
 *  See AISVGFilterAddedNotifierData.
 */

AIEvent.SVG_FILTER_ADDED = "AI SVG Filter Added Notifier";

/**
 *  Sent when the Swatch Library is opened and has been modified since the last load or when it is reloaded because the user saved to it.
 */

AIEvent.SWATCH_LIBRARY_CHANGED = "AI Swatch Library Changed Notifier";
AIEvent.SWATCH_LIBRARY_DIALOG_CHANGED =
  "AI Swatch Library Dialog Changed Notifier";
AIEvent.SWATCH_LIST_CHANGED = "AI Swatch List Changed Notifier";
AIEvent.SWATCH_LIST_CHANGED_INTERNALLY =
  "AI Swatch List Changed Internally Notifier";
AIEvent.SWATCH_REPLACE_COLOR = "AI Swatch Replace Color Notifier";
AIEvent.CREATE_NEW_SWATCH = "AI Create New Swatch Notifier";
AIEvent.CREATE_NEW_SWATCH_WITH_DEFAULT_PARAM =
  "AI Create New Swatch With Default Param Notifier";
AIEvent.DOC_SWATCHES_SELECTION_CHANGED =
  "AI Doc Swatches Selection Changed Notifier";

/**
 *  Sent when symbols are added, deleted, redefined (including indirectly due to redefinition of elements used inside the symbol pattern), renamed, sorted or moved in the symbol list. This message is sent even when the affected symbols are unlisted. See AISymbolSuite
 */

AIEvent.ART_SYMBOL_SET_CHANGED = "AI Art Symbol Set Changed Notifier";

/**
 *  Sent after kAIArtSymbolSetChangedNotifier, with the same time stamp. Provides details of the change. The notify data is anAISymbolSetChangeNotifierData.
 */

AIEvent.ART_SYMBOL_SET_DETAILED_CHANGE =
  "AI Art Symbol Set Detailed Change Notifier";

/**
 *  Sent when symbols are added to, removed from, or reordered in the symbol list. This message is NOT sent when unlisted symbols are created, deleted or modified, nor when the definitions or names of symbols are changed, even if they are listed. See AISymbolSuite
 */

AIEvent.ART_SYMBOL_LIST_CHANGED = "AI Art Symbol List Changed Notifier";

/**
 *  Sent when a symbol instance is double-clicked.
 */

AIEvent.ART_SYMBOL_DOUBLE_CLICKED = "AI Art Symbol Double Clicked Notifier";

/**
 *  See AITagSuite
 */

AIEvent.TAG_CHANGED = "AI Tag Changed Notifier";

/**
 *  Sent when effective tool is changed, either permanently or temporarily using modifier keys (such as Cmd, Cntl, or Spacebar). Data is AIEffectiveToolChangeData Replaces individual notifiers for tool suspend and resume actions that have been deprecated.
 */

AIEvent.EFFECTIVE_TOOL_CHANGED = "AI Effective Tool Changed Notifier";
AIEvent.USER_TOOL_CHANGED = "AI User Tool Changed Notifier";

/**
 *  Sent when a tool is selected. The data is the AIToolHandle. Reselection of an already selected tool sends both kAIToolDeselectedNotifier and kAIToolSelectedNotifier with the kSelectorAIReselectTool message.
 */

AIEvent.TOOL_SELECTED = "AI Tool Selected Notifier";

/**
 *  Sent when a tool is deselected. The data is the AIToolHandle.
 */

AIEvent.TOOL_DESELECTED = "AI Tool Deselected Notifier";

/**
 *  Send to notify tools to invalidate their current view when a scroll is happening on the document
 */

AIEvent.INVALIDATE_BY_SCROLL = "AI Invalidate By Scroll Notifier";

/**
 *  Sent to notify tools that they should clear any editing state that they maintain. Tools other than the current tool might maintain editing state; for example, selecting the zoom tool does not clear the editing state of the pen tool, which remembers the path to which it is adding points.
 */

AIEvent.TOOL_CLEAR_STATE = "AI Tool Clear State Notifier";

/**
 *  Sent when the title string of a tool is changed. See AIToolSuite::SetToolTitle()
 */

AIEvent.TOOL_TITLE_CHANGED = "AI Tool Title Changed Notifier";

/**
 *  Sent when a tool's rollover tooltip is changed.
 */

AIEvent.TOOL_TOOLTIP_CHANGED = "AI Tool Tooltip Changed Notifier";

/**
 *  Sent when a tool's help ID is changed. See AIToolSuite::SetToolHelpID()
 */

AIEvent.TOOL_HELP_ID_CHANGED = "AI Tool Help ID Changed Notifier";
AIEvent.TOOL_CHANGED = "AI Tool Changed Notifier";

/**
 *  Sent when the tool window has changed.
 */

AIEvent.TOOL_WINDOW_CHANGED = "AI Tool Window Changed Notifier";
AIEvent.TOOL_SUSPEND = "AI Tool Suspend Notifier";
AIEvent.TOOL_RESUME = "AI Tool Resume Notifier";

/**
 *  Sent when AIToolTabletPointerType is changed.
 */

AIEvent.TOOL_TABLET_POINTER_TYPE_CHANGED =
  "AI Tablet Pointer Type Changed Notifier";

/**
 *  Sent when the modifier keys for the current tool are changed.
 */

AIEvent.TOOL_MODIFIERS_CHANGED = "AI Tool Modifiers Changed Notifier";
AIEvent.TOOL_SUSPENDED_BY_SPACEBAR = "AI Tool Suspended by Spacebar Notifier";
AIEvent.TOOL_RESUMED_BY_SPACEBAR = "AI Tool Resumed by Spacebar Notifier";
AIEvent.TOOL_SUSPENDED_BY_CMD_KEY = "AI Tool Suspended by Cmd Key Notifier";
AIEvent.TOOL_RESUMED_BY_CMD_KEY = "AI Tool Resumed by Cmd Key Notifier";

/**
 *  Sent by the eyedropper when it is selected and dragged. The data is an AIEyedropperDragNotifyData specifying the event and whether the path style has changed as a result.
 */

AIEvent.EYEDROPPER_DRAG = "AI Eyedropper Drag Notifier";
AIEvent.CURVATURE_TOOL_CLEAR_WIDGET =
  "AI Curvature Tool Clear Widgets Notifier";
AIEvent.XML_NAME_CHANGED = "AI XML Name Changed Notifier";

/**
 *  Sent when UI brightness is changed.
 */

AIEvent.UI_BRIGHTNESS_CHANGED = "AI UI Brightness Changed Notifier";

/**
 *  Sent after an Update call is made and completed. Message data contains the Vectorize object being updated. See AIVectorizeSuite.
 */

AIEvent.VECTORIZE_UPDATE = "AI Vectorize Update Notifier";

/**
 *  Sent when an operation requiring update of metadata is about to occur. For example, sent before any file format is called or written. Register for this if you need to keep metadata current. If you add any function that assumes the metadata is current (for a metadata browser, for example), send this notifier. See AIXMLDocumentSuite
 */

AIEvent.METADATA_SYNC = "AI Metadata Sync Notifier";

export { AIEventAdapter, AIEvent };