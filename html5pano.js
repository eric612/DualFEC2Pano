/*
Copyright (c) 2010, Martin Wengenmayer ( www.cheetah3d.com )
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are
permitted provided that the following conditions are met:

-Redistributions of source code must retain the above copyright notice, this list of
conditions and the following disclaimer.

-Redistributions in binary form must reproduce the above copyright notice, this list
of conditions and the following disclaimer in the documentation and/or other materials
provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER
OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
*/

const 	FPS = 30;
const	DEG2RAD=Math.PI/180.0;

//Canvas to which to draw the panorama
var		pano_canvas=null;

//Event state
var		mouseIsDown=false;
var		mouseDownPosLastX=0;
var		mouseDownPosLastY=0;
var		displayInfo=false;
var		highquality=true;

//Camera state
var		cam_heading=90.0;
var		cam_pitch=90.0;
var 	cam_fov=90;

//Load image
var img_buffer=null;
var img = new Image();
img.onload = imageLoaded;
img.src = 'fisheye.png';


function init_pano(canvasid){
	//get canvas and set up call backs
	pano_canvas = document.getElementById('canvas');
	pano_canvas.onmousedown = mouseDown;
	window.onmousemove = mouseMove;
	window.onmouseup = mouseUp;
	window.onmousewheel = mouseScroll;
	window.onkeydown = keyDown;
	draw();
	//setInterval(draw, 1000/FPS);
	}

function imageLoaded(){
	var   buffer = document.createElement("canvas");
	var   buffer_ctx = buffer.getContext ("2d");

	//set buffer size
	buffer.width = img.width;
	buffer.height = img.height;

 	//draw image
	buffer_ctx.drawImage(img,0,0);

 	//get pixels
 	var buffer_imgdata = buffer_ctx.getImageData(0, 0,buffer.width,buffer.height);
 	var buffer_pixels = buffer_imgdata.data;

 	//convert imgdata to float image buffer
 	img_buffer = new Array(img.width*img.height*3);
 	for(var i=0,j=0;i<buffer_pixels.length;i+=4, j+=3){
		img_buffer[j] 	= buffer_pixels[i];
		img_buffer[j+1] = buffer_pixels[i+1];
		img_buffer[j+2] = buffer_pixels[i+2];
 		}
	}


function mouseDown(e){
	mouseIsDown=true;
	mouseDownPosLastX=e.clientX;
	mouseDownPosLastY=e.clientY;
}

function mouseMove(e){
	if(mouseIsDown==true){
		cam_heading-=(e.clientX-mouseDownPosLastX);
		cam_pitch+=0.5*(e.clientY-mouseDownPosLastY);
		cam_pitch=Math.min(180,Math.max(0,cam_pitch));
		mouseDownPosLastX=e.clientX;
		mouseDownPosLastY=e.clientY;
		draw();
		}
}

function mouseUp(e){
	mouseIsDown=false;
	draw();
}

function mouseScroll(e){
	cam_fov+=e.wheelDelta/120;
	cam_fov=Math.min(90,Math.max(30,cam_fov));
	draw();
}

function keyDown(e){
	if(e.keyCode==73){	//i==73 Info
		displayInfo = !displayInfo;
		draw();
		}
}

function MatrixProduct(h1,h2,out_h,w,h)
{
    var val;
    var i,j,k;
    for (i = 0; i<h; i++)
    {
        for (j = 0; j<w; j++)
        {
            val = 0.0;
            for (k = 0; k<h; k++)
            {
                val += h1[i*w+k]*h2[k*w+j];
            }
            out_h[i*w+j] = val;
        }
    }
}
function CalcRotMatrix3D(theta_x,theta_y,theta_z,out_m)
{
    var rot_x =
    [
        1,0,0,
        0,Math.cos(theta_x),-Math.sin(theta_x),
        0,Math.sin(theta_x),Math.cos(theta_x)
    ];
    var rot_y=
    [
        Math.cos(theta_y),0,Math.sin(theta_y),
        0,1,0,
        -Math.sin(theta_y),0,Math.cos(theta_y)
    ];
    var rot_z =
    [
        Math.cos(theta_z),-Math.sin(theta_z),0,
        Math.sin(theta_z),Math.cos(theta_z),0,
        0,0,1
    ];

    var tmp_m =[];
    MatrixProduct(rot_y,rot_z,tmp_m,3,3);
    MatrixProduct(tmp_m,rot_x,out_m,3,3);
}
function renderPanorama(canvas){
    if(canvas!=null && img_buffer!=null){
        var ctx = canvas.getContext("2d");
        var imgdata = ctx.getImageData(0, 0,canvas.width,canvas.height);
        var pixels = imgdata.data;

        var src_width=img.width;
        var src_height=img.height;
        var dest_width=canvas.width;
        var dest_height=canvas.height;

        //calculate camera plane
        var theta_fac=src_height/Math.PI;
        var phi_fac=src_width*0.5/Math.PI
        var ratioUp=Math.tan(cam_fov*DEG2RAD/2.0);
        var ratioRight=ratioUp*1.33;
        var camDirX=Math.sin(cam_pitch*DEG2RAD)*Math.sin(cam_heading*DEG2RAD);
        var camDirY=Math.cos(cam_pitch*DEG2RAD);
        var camDirZ=Math.sin(cam_pitch*DEG2RAD)*Math.cos(cam_heading*DEG2RAD);
        var camUpX=ratioUp*Math.sin((cam_pitch-90.0)*DEG2RAD)*Math.sin(cam_heading*DEG2RAD);
        var camUpY=ratioUp*Math.cos((cam_pitch-90.0)*DEG2RAD);
        var camUpZ=ratioUp*Math.sin((cam_pitch-90.0)*DEG2RAD)*Math.cos(cam_heading*DEG2RAD);
        var camRightX=ratioRight*Math.sin((cam_heading-90.0)*DEG2RAD);
        var camRightY=0.0;
        var camRightZ=ratioRight*Math.cos((cam_heading-90.0)*DEG2RAD);
        var camPlaneOriginX=camDirX + 0.5*camUpX - 0.5*camRightX;
        var camPlaneOriginY=camDirY + 0.5*camUpY - 0.5*camRightY;
        var camPlaneOriginZ=camDirZ + 0.5*camUpZ - 0.5*camRightZ;

        //render image
        var	i,j;
        var mtx =[];
        var mtx_right =[];

        var theta1 = 180; //calibration parameter 1 , horizontal rotation
        var theta2 = 0; //calibration parameter 2 , optical axis rotation
        var translation1 = 0; //calibration parameter 3 , 3d translation
        var translation2 = 0; //calibration parameter 4 , 3d translation
        var translation3 = 0; //calibration parameter 5 , 3d translation
        var radius = 2.0 * 446; //calibration parameter 6 , radius of image circle
        var lensFOV = 190.0; //calibration parameter 7 , field of view
        var ocx1 = 0.2244; //calibration parameter 8 , optical center x of camera 1
        var ocy1 = 0.49; //calibration parameter 9 , optical center y of camera 1
        var ocx2 = 0.732; //calibration parameter 10 , optical center x of camera 2
        var ocy2 = 0.469; //calibration parameter 11 , optical center y of camera 2

        var FOV = (lensFOV/180.0)*Math.PI; // FOV of the fisheye, eg: 180 degrees

        CalcRotMatrix3D((cam_pitch-90)*Math.PI/180.0,0,(cam_heading-90)*Math.PI/180.0,mtx);
        CalcRotMatrix3D((cam_pitch-90)*Math.PI/180.0,(theta2)*Math.PI/180.0,(cam_heading-90+theta1)*Math.PI/180.0,mtx_right);
        for(i=0;i<dest_height;i++){
            for(j=0;j<dest_width;j++){
                var	fx=j/dest_width;
                var	fy=i/dest_height;

                var out_theta = 2.0 * Math.PI * (fx  - 0.5); // -pi to pi
                var out_phi = Math.PI * (fy  - 0.5);	// -pi/2 to pi/2

                // Vector in 3D space
                var rX = Math.cos(out_phi) * Math.sin(out_theta);
                var rY = Math.cos(out_phi) * Math.cos(out_theta);
                var rZ = Math.sin(out_phi);

                var rayX = rX*mtx[0]+rY*mtx[1]+rZ*mtx[2];
                var rayY = rX*mtx[3]+rY*mtx[4]+rZ*mtx[5];
                var rayZ = rX*mtx[6]+rY*mtx[7]+rZ*mtx[8];

                //var	rayNorm=1.0/Math.sqrt(rayX*rayX + rayY*rayY + rayZ*rayZ);
                var	rayNorm=Math.sqrt(rayX*rayX + rayZ*rayZ);
                // Calculate fisheye angle and radius
                var theta = Math.atan2(rayZ,rayX);
                var phi = Math.atan2(rayNorm,rayY);
                var r1 = radius * phi / FOV;

                // Pixel in fisheye space
                var	theta_i=Math.floor(ocx1 * src_width + r1 * Math.cos(theta));
                var	phi_i=Math.floor( ocy1 * src_height + r1 * Math.sin(theta));


                var	dest_offset=4*(i*dest_width+j);
                var	src_offset=3*(phi_i*src_width + theta_i);
                if(theta_i>=0 && theta_i<src_width/2 && phi_i>=0 && phi_i<src_height) {
                    pixels[dest_offset] = img_buffer[src_offset];
                    pixels[dest_offset + 1] = img_buffer[src_offset + 1];
                    pixels[dest_offset + 2] = img_buffer[src_offset + 2];
                } else r1 = 1920;

                rayX = rX*mtx_right[0]+rY*mtx_right[1]+rZ*mtx_right[2]+translation1;
                rayY = rX*mtx_right[3]+rY*mtx_right[4]+rZ*mtx_right[5]+translation2;
                rayZ = rX*mtx_right[6]+rY*mtx_right[7]+rZ*mtx_right[8]+translation3;

                //var	rayNorm=1.0/Math.sqrt(rayX*rayX + rayY*rayY + rayZ*rayZ);
                rayNorm=Math.sqrt(rayX*rayX + rayZ*rayZ);
                // Calculate fisheye angle and radius
                theta = Math.atan2(rayZ,rayX);
                phi = Math.atan2(rayNorm,rayY);
                var r2 = radius * phi / FOV;

                // Pixel in fisheye space
                theta_i=Math.floor(ocx2 * src_width + r2 * Math.cos(theta));
                phi_i=Math.floor( ocy2 * src_height + r2 * Math.sin(theta));

                var	dest_offset=4*(i*dest_width+j);
                var	src_offset=3*(phi_i*src_width + theta_i);
                if(theta_i>=src_width/2 && theta_i<src_width && phi_i>=0 && phi_i<src_height && r2<r1) {
                    pixels[dest_offset] = img_buffer[src_offset];
                    pixels[dest_offset + 1] = img_buffer[src_offset + 1];
                    pixels[dest_offset + 2] = img_buffer[src_offset + 2];
                }
                //pixels[dest_offset+3] = img_buffer[src_offset+3];
            }
        }

        //upload image data
        ctx.putImageData(imgdata, 0, 0);
    }
}
function drawRoundedRect(ctx,ox,oy,w,h,radius){
	ctx.beginPath();
	ctx.moveTo(ox + radius,oy);
	ctx.lineTo(ox + w - radius,oy);
	ctx.arc(ox +w-radius,oy+ radius, radius,-Math.PI/2,0, false);
	ctx.lineTo(ox + w,oy + h - radius);
	ctx.arc(ox +w-radius,oy + h - radius, radius,0,Math.PI/2, false);
	ctx.lineTo(ox + radius,oy + h);
	ctx.arc(ox + radius,oy + h - radius, radius,Math.PI/2,Math.PI, false);
	ctx.lineTo(ox,oy + radius);
	ctx.arc(ox + radius,oy + radius, radius,Math.PI,3*Math.PI/2, false);
	ctx.fill();
}


function draw(){
    if(pano_canvas!=null && pano_canvas.getContext!=null){
    	var ctx = pano_canvas.getContext("2d");

    	//clear canvas
    	ctx.fillStyle = "rgba(0, 0, 0, 1)";
    	ctx.fillRect(0,0,pano_canvas.width,pano_canvas.height);

		//render paromana direct
		var startTime = new Date();
			renderPanorama(pano_canvas);
		var endTime = new Date();

		//draw info text
		if(displayInfo==true){
			ctx.fillStyle = "rgba(255,255,255,0.75)";
			drawRoundedRect(ctx,20,pano_canvas.height-60-20,180,60,7);

			ctx.fillStyle = "rgba(0, 0, 0, 1)";
			ctx.font="10pt helvetica";
			ctx.fillText("Canvas = " +  pano_canvas.width + "x" + pano_canvas.height,30,pano_canvas.height-60);
			ctx.fillText("Image size = " + img.width + "x" + img.height,30,pano_canvas.height-45);
			ctx.fillText("FPS = " + (1000.0/(endTime.getTime()-startTime.getTime())).toFixed(1),30,pano_canvas.height-30);
			}
    	}
   }

