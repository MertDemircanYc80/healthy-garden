import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { styles as u } from "@/components/ui";
import { C, F, R } from "@/theme";

const KEY = "healthgarden:plantingGuide:v1";
const STEPS = [
  { title:"Choose your first plot", body:"Your personal garden starts empty with 1,000 gold. Tap a highlighted + plot to choose a flower or tree. You can plant from inventory or buy and plant in one step." },
  { title:"Stock up and care for it", body:"Tap the gold badge at the top right to open Market. Watering uses one can and fertilizing uses one fertilizer. Each plant can receive each care action once per day. Your remaining supplies are shown in Garden and Market." },
  { title:"Give your garden sunlight", body:"Record health totals in Report to build personal goals. Meeting goals brings sunlight and gold. Plants grow after your local day ends; they rest when you are away. The sample garden in settings has separate progress and a Next day button." },
];
export function PlantingGuide({ replay, onClose }: { replay:boolean; onClose:()=>void }) {
  const [firstVisit, setFirstVisit] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY).then(value => { if (active && !value) setFirstVisit(true); }).catch(() => {});
    return () => { active = false; };
  }, []);
  async function close() {
    try { await AsyncStorage.setItem(KEY,"done"); }
    catch { setError("Couldn’t save the guide preference. You can still close it."); }
    setFirstVisit(false); setStep(0); onClose();
  }
  const current = STEPS[step];
  return <Modal visible={firstVisit || replay} transparent animationType="fade" onRequestClose={() => { void close(); }}>
    <View style={{flex:1,backgroundColor:"rgba(8,20,12,0.45)",justifyContent:"center",padding:20}}>
      <ScrollView style={{maxHeight:"80%",flexGrow:0,backgroundColor:C.pine,borderRadius:R.island}} contentContainerStyle={{padding:24,gap:18}}>
        <Text style={u.muted}>How to play · {step+1} of {STEPS.length}</Text>
        <Text style={{fontFamily:F.display,fontSize:26,color:C.mist}}>{current.title}</Text>
        <Text style={u.body}>{current.body}</Text>
        <Pressable accessibilityRole="button" onPress={() => { if (step < STEPS.length-1) setStep(step+1); else void close(); }} style={{padding:14,borderRadius:R.pill,backgroundColor:C.moss,alignItems:"center"}}><Text style={{color:C.pine,fontWeight:"700"}}>{step === STEPS.length-1 ? "Start planting" : "Next"}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => { void close(); }} style={{padding:12,alignItems:"center"}}><Text style={{color:C.fern}}>Skip guide</Text></Pressable>
        {!!error && <Text style={u.muted}>{error}</Text>}
      </ScrollView>
    </View>
  </Modal>;
}
