package com.edunixo.app;

import android.content.Context;
import androidx.work.Constraints;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "EdunixoSyncGuardian")
public class EdunixoSyncGuardianPlugin extends Plugin {
    private static final String PREFS="edunixo_sync_guardian";
    private static final String UNIQUE_WORK="edunixo_sync_guardian_waiting";

    @PluginMethod public void getState(PluginCall call){
        var prefs=getContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE);
        JSObject out=new JSObject();out.put("native",true);out.put("enabled",prefs.getBoolean("enabled",true));out.put("pendingCount",prefs.getInt("pending_count",0));out.put("workScheduled",prefs.getBoolean("work_scheduled",false));call.resolve(out);
    }

    @PluginMethod public void setEnabled(PluginCall call){
        boolean enabled=Boolean.TRUE.equals(call.getBoolean("enabled",true));
        getContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putBoolean("enabled",enabled).apply();
        if(!enabled){WorkManager.getInstance(getContext()).cancelUniqueWork(UNIQUE_WORK);getContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putBoolean("work_scheduled",false).apply();}
        else scheduleIfNeeded();
        JSObject out=new JSObject();out.put("enabled",enabled);call.resolve(out);
    }

    @PluginMethod public void updatePending(PluginCall call){
        Integer raw=call.getInt("pendingCount",0);int pending=Math.max(0,raw==null?0:raw);
        getContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putInt("pending_count",pending).apply();
        if(pending<=0){WorkManager.getInstance(getContext()).cancelUniqueWork(UNIQUE_WORK);getContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putBoolean("work_scheduled",false).apply();}
        else scheduleIfNeeded();
        var prefs=getContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE);
        JSObject out=new JSObject();out.put("pendingCount",pending);out.put("workScheduled",prefs.getBoolean("work_scheduled",false));call.resolve(out);
    }

    private void scheduleIfNeeded(){
        var prefs=getContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE);
        if(!prefs.getBoolean("enabled",true)||prefs.getInt("pending_count",0)<=0)return;
        Constraints constraints=new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        OneTimeWorkRequest work=new OneTimeWorkRequest.Builder(EdunixoSyncGuardianWorker.class).setConstraints(constraints).setInitialDelay(15,TimeUnit.MINUTES).build();
        WorkManager.getInstance(getContext()).enqueueUniqueWork(UNIQUE_WORK,ExistingWorkPolicy.REPLACE,work);
        prefs.edit().putBoolean("work_scheduled",true).apply();
    }
}
