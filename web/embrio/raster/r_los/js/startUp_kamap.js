/**********************************************************************
 * 
 * purpose: init sequence for DHTML interface
 *
 * authors: Luca Casagrande (...) and Lorenzo Becchi (lorenzo@ominiverdi.com)
 *
 * TODO:
 *   - a lot...
 * 
 **********************************************************************
 *
 * Copyright (C) 2006 ominiverdi.org
 *  
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *  
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA
 *
 **********************************************************************/



//MAP variables
var outimg = null;//old stuff
var map_extent = null;//old stuff
var height_extent = null;//old stuff
var distance_extent = null;//old stuff
var input_x=null;
var input_y=null;

//ajax call vars
var image_url = null;//old stuff
var xml_dump = null;//old stuff

//interface vars
var steps = 9; //number of steps for each select


var myKaMap = null;
var queryParams = null;
		SET_DHTML();
		
		//interface vars
		var canvas; //show appended objects
		
		//MODULE VARS
		var module_path = 'mod/mod_r_los.php';
		var identifier = 'visibility2';//Identifier name for WPS service
		var wpsCache = '/home/doktoreas/pywps.ominiverdi.org/subversion/trunk/web/tmp/';
				
		
		//WPS manager
		var wpsManager;
		
		
		/**
		 * parse the query string sent to this window into a global array of key = value pairs
		 * this function should only be called once
		 */
		function parseQueryString()
		{
			queryParams = [];
			var s=window.location.search;
			if (s!='')
			{
				s=s.substring( 1 );
				var p=s.split('&');
				for (var i=0;i<p.length;i++)
				{
					var q=p[i].split('=');
					queryParams[q[0]]=q[1];
				}
			}
		}
		
		/**
		 * get a query value by key.  If the query string hasn't been parsed yet, parse it first.
		 * Return an empty string if not found
		 */
		function getQueryParam(p)
		{
			if (!queryParams)
			{
				parseQueryString();
			}
			if (queryParams[p])
				return queryParams[p];
			else 
				return '';
		}
		
		function myOnLoad()
		{
			initDHTMLAPI();
			
			var map = getQueryParam('map');
			var extents = getQueryParam('extents');
			var cps = getQueryParam('cps');
			
			myKaMap = new kaMap( 'viewport' );
			var kaNav = new kaNavigator( myKaMap );
			kaNav.activate();
			myKaZoomer = new kaZoomer(myKaMap); 
			//myKaMap.resize();//??? maybe not needed
			myKaMap.registerForEvent( KAMAP_MAP_INITIALIZED, null, myMapInitialized );
			myKaMap.registerForEvent( KAMAP_SCALE_CHANGED, null, myScaleChanged );
			myKaMap.registerForEvent( KAMAP_MAP_CLICKED, null, myMapClicked );
			//myKaMap.registerForEvent( WPS_LAYER_PAINTING, null, waitEnd );

			myKaMap.initialize( map, extents, cps );
		}
		function myMapInitialized(){
			/* Embrio startup*/
				//set img object
				outimg = document.getElementById('outimg');
				//outimg.onmousedown = getCoords;
				//get params
				map_extent = document.getElementById('map_extent').value;
				map_extent = map_extent.split(',');
				height_extent = document.getElementById('height_extent').value.split(',');
				height_unit = parseInt((height_extent[1]-height_extent[0])/steps*100)/100;
				distance_extent = document.getElementById('distance_extent').value.split(',');
				distance_unit = parseInt((distance_extent[1]-distance_extent[0])/steps*100)/100;
				
				//print ranges
				getRawObject('observer_range').innerHTML = height_extent[0] + ' -&gt; ' + height_extent[1]; 
				getRawObject('maxdist_range').innerHTML = distance_extent[0] + ' -&gt; ' + distance_extent[1]; 
				
				//update selects
				var maxdist = getRawObject('maxdist');
				var observer = getRawObject('observer');
				var height = parseInt(height_extent[0]);
				var distance = parseInt(distance_extent[0]);
				for(i=0;i<=steps;i++) {
					if(i==steps){
						height = parseInt(height_extent[1]);
						distance = parseInt(distance_extent[1]);
						maxdist[i] = new Option(distance,distance,false,false);
						observer[i] = new Option(height,height,false,false);
					} else{  
						maxdist[i] = new Option(distance,distance,false,false);
						observer[i] = new Option(height,height,false,false);
					}
					
					height = parseInt((height + height_unit)*100)/100;
					distance = parseInt(distance + distance_unit);
				}
				
				//set button event
				getRawObject('go').onclick = runPywps;
				
				//create drawing canvas
				canvas = myKaMap.createDrawingCanvas('10');
		}
		function myScaleChanged(eventID, scale){
		}
		function myMapClicked(eventID, coords){
			//alert(coords[0]+ ' ' + coords[1]);
			setFields(coords[0],coords[1]);
			
			//empty pins
			myKaMap.removeAllObjects(canvas);
			//create the pin obj
			var pinDiv = document.createElement('div');
			pinDiv.id = 'pinDiv';
			var pinImg = document.createElement('img');
			pinImg.src = '../../ka-map/htdocs/images/tip-yellow.png';
			pinImg.style.position = 'absolute';
			pinImg.style.top = '-19px';
			pinImg.style.left = '-6px';
			pinDiv.appendChild(pinImg);
			myKaMap.addObjectGeo( canvas, coords[0], coords[1], pinDiv );
		}

function runPywps(){
	if(input_x==null){
		alert('click on map for coords first');
		return;
	}
	var maxdistSel = getRawObject('maxdist');
	var maxdist= maxdistSel.options	[maxdistSel.selectedIndex].value;
	var observerSel = getRawObject('observer');
	var observer = observerSel.options[observerSel.selectedIndex].value;
	//var url = 'mod/r_los.php?xvalue='+input_x+'&yvalue='+input_y+'&maxdist='+maxdist+'&observer='+observer;
	
	//WPSMANAGER part
	
	
	if(!wpsManager.setWpsCache)wpsManager = new wpsManager(myKaMap);
	var map = myKaMap.getCurrentMap();	
	var extents = map.currentExtents;
	var datainputs = 'x,'+input_x+',y,'+input_y+',maxdist,'+maxdist+',observer,'+observer;
	//waitStart();
	wpsManager.setWpsCache(wpsCache);
	wpsManager.query(map.name,extents,identifier,datainputs);
	//WPSMANAGER part end
	
	//to be deleted once WPS MANAGER works
	//var url = module_path+'?xvalue='+input_x+'&yvalue='+input_y+'&maxdist='+maxdist+'&observer='+observer;
	
	//call(url, this, parsePywpsOut);
	//to be deleted once WPS MANAGER works END
}

function parsePywpsOut (szInit){
	
	if (szInit.substr(0, 1) != "/") {
        alert(szInit);
        return false;
    }

    eval(szInit);
	//getRawObject('console').innerHTML = xml_dump.replace(/\+/g," ");
	//getRawObject('outimg').src = image_url;
	//getRawObject('outimg').onload = waitEnd;
}


function setFields(gX,gY){
        //set input objects
        input_x = parseInt(gX);
        //getRawObject('xvalue').value = input_x;
        getRawObject('xvalue_span').innerHTML = input_x;
        input_y = parseInt(gY);
        //getRawObject('yvalue').value = input_y;
        getRawObject('yvalue_span').innerHTML = input_y;
}



//trasform coords from image pixel space to map geo space
function waitStart  (){
	var parent = getRawObject('output');
	var wait = getRawObject('wait');
	if( wait)wait.parentNode.removeChild(wait);
	var div = document.createElement('div');
	div.id = 'wait';
	div.innerHTML ='Processing... please wait';
	parent.insertBefore(div,parent.firstChild);
}

//trasform coords from image pixel space to map geo space
function waitEnd(){
	var wait = getRawObject('wait');
	if( wait)wait.parentNode.removeChild(wait);
}