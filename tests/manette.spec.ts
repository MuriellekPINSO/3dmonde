import {test,expect} from '@playwright/test';

test('DualSense simulée : démarrage et déplacement au joystick gauche',async({page})=>{
  test.setTimeout(90000);
  await page.addInitScript(()=>{
    const w=window as any;
    w.__THREE_DEVTOOLS__=new EventTarget();w.__scenes=[];
    w.__THREE_DEVTOOLS__.addEventListener('observe',(e:any)=>{if(e.detail.isScene)w.__scenes.push(e.detail);});
    w.__haptics=[];
    const vibrationActuator={
      type:'dual-rumble',
      playEffect:(type:string,options:any)=>{w.__haptics.push({type,...options});return Promise.resolve('complete');},
      reset:()=>Promise.resolve('complete'),
    };
    w.__pad={
      axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0,touched:false})),
      connected:true,id:'DualSense Wireless Controller',index:0,mapping:'standard',timestamp:0,
      vibrationActuator,hapticActuators:[vibrationActuator],hand:'',pose:null,
    };
    Object.defineProperty(navigator,'getGamepads',{value:()=>[w.__pad]});
  });
  await page.goto('/');
  await expect(page.locator('#controller-status')).toBeVisible();
  await expect(page.locator('#controller-status')).toContainText('VIBRATION');
  await page.evaluate(()=>{(window as any).__pad.buttons[0].pressed=true;});
  await expect(page.locator('#welcome')).not.toHaveAttribute('open','');
  await page.evaluate(()=>{(window as any).__pad.buttons[0].pressed=false;});
  const z=async()=>page.evaluate(()=>{
    const scene=(window as any).__scenes.find((s:any)=>s.getObjectByName('joueur'));
    return scene.getObjectByName('joueur').position.z as number;
  });
  const debut=await z();
  await page.evaluate(()=>{(window as any).__pad.axes[1]=-1;});
  await expect.poll(z,{timeout:15000}).toBeLessThan(debut-.5);
  await expect.poll(()=>page.evaluate(()=>
    (window as any).__haptics.some((effet:any)=>effet.duration===85&&effet.weakMagnitude>0)
  )).toBe(true);
  await page.evaluate(()=>{(window as any).__pad.axes[1]=0;});
});

test('DualSense Bluetooth directe : sélection et boutons analogiques',async({page})=>{
  test.setTimeout(90000);
  await page.addInitScript(()=>{
    const w=window as any;
    w.__THREE_DEVTOOLS__=new EventTarget();w.__scenes=[];
    w.__THREE_DEVTOOLS__.addEventListener('observe',(e:any)=>{if(e.detail.isScene)w.__scenes.push(e.detail);});
    const bouton=()=>({pressed:false,value:0,touched:false});
    w.__ghost={axes:[0,0],buttons:Array.from({length:4},bouton),connected:true,id:'Virtual Gamepad',index:0,mapping:'',timestamp:0};
    w.__pad={
      axes:[0,0,0,0],buttons:Array.from({length:18},bouton),connected:true,
      id:'DualSense Wireless Controller',index:1,mapping:'',timestamp:12,
    };
    Object.defineProperty(navigator,'getGamepads',{value:()=>[w.__ghost,w.__pad]});
  });
  await page.goto('/');
  await expect(page.locator('#controller-status')).toBeVisible();
  await expect(page.locator('#controller-status')).toHaveAttribute('title',/DualSense Wireless Controller.*PlayStation direct/);
  // En mapping PlayStation brut, la Croix est le bouton 1. Certains pilotes
  // ne renseignent que sa valeur analogique.
  await page.evaluate(()=>{(window as any).__pad.buttons[1].value=1;});
  await expect(page.locator('#welcome')).not.toHaveAttribute('open','');
  await page.evaluate(()=>{(window as any).__pad.buttons[1].value=0;});
  const z=async()=>page.evaluate(()=>{
    const scene=(window as any).__scenes.find((s:any)=>s.getObjectByName('joueur'));
    return scene.getObjectByName('joueur').position.z as number;
  });
  const debut=await z();
  await page.evaluate(()=>{(window as any).__pad.axes[1]=-1;});
  await expect.poll(z,{timeout:15000}).toBeLessThan(debut-.5);
});
