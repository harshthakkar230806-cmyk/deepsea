import { useEffect, useRef } from 'react';
import * as THREE from 'three';
export default function MenuScene() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!; const r = new THREE.WebGLRenderer({ antialias:true }); r.setSize(el.clientWidth, el.clientHeight); r.setPixelRatio(Math.min(devicePixelRatio,2)); el.appendChild(r.domElement);
    const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x041a30, 0.018); scene.background = new THREE.Color(0x041a30);
    const cam = new THREE.PerspectiveCamera(60, el.clientWidth/el.clientHeight, 0.1, 300);
    scene.add(new THREE.AmbientLight(0x4488aa, 0.5)); const sun = new THREE.DirectionalLight(0x88ccff, 1); sun.position.set(0,20,5); scene.add(sun);
    const sub = new THREE.Group(); const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.8,2.4,6,12), new THREE.MeshStandardMaterial({ color:0xd99a2b, metalness:0.4, roughness:0.5 })); body.rotation.z = Math.PI/2; sub.add(body);
    const lamp = new THREE.SpotLight(0xbfeaff, 40, 40, 0.5, 0.6); lamp.position.set(1.8,0,0); lamp.target.position.set(10,-3,0); sub.add(lamp, lamp.target); scene.add(sub);
    const N = 600, pos = new Float32Array(N*3); for (let i=0;i<N;i++){ pos[i*3]=(Math.random()-.5)*80; pos[i*3+1]=-Math.random()*400; pos[i*3+2]=(Math.random()-.5)*60; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos,3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color:0x66ffee, size:0.15, transparent:true, opacity:0.7 })));
    const glow: THREE.Mesh[] = []; for (let i=0;i<30;i++){ const m = new THREE.Mesh(new THREE.SphereGeometry(0.3+Math.random()*0.5,10,10), new THREE.MeshBasicMaterial({ color:i%3?0x33ddff:0x44ffaa, transparent:true, opacity:0.6 })); m.position.set((Math.random()-.5)*50,-20-Math.random()*300,-10-Math.random()*30); scene.add(m); glow.push(m); }
    let raf = 0; const clock = new THREE.Clock();
    const loop = () => { const t = clock.getElapsedTime(); const y = -t*1.5; sub.position.set(Math.sin(t*.3)*0.5, y, 0); sub.rotation.z = Math.sin(t*.5)*.05; cam.position.set(-8, y+2, 10); cam.lookAt(0,y,0);
      const k = Math.min(1, -y/300); const c = new THREE.Color(0x0a5c8a).lerp(new THREE.Color(0x000308), k); scene.background = c; (scene.fog as THREE.FogExp2).color = c;
      glow.forEach((m,i)=>{ m.position.x += Math.sin(t+i)*0.01; (m.material as THREE.MeshBasicMaterial).opacity = 0.4+0.3*Math.sin(t*2+i); });
      r.render(scene, cam); raf = requestAnimationFrame(loop); }; loop();
    const onResize = () => { r.setSize(el.clientWidth, el.clientHeight); cam.aspect = el.clientWidth/el.clientHeight; cam.updateProjectionMatrix(); }; addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', onResize); r.dispose(); el.removeChild(r.domElement); };
  }, []);
  return <div ref={ref} style={{ position:'absolute', inset:0 }} />;
}
