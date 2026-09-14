package com.edunixo.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BellAlarmPlugin.class);
        registerPlugin(EdunixoMLPlugin.class);
        registerPlugin(EdunixoSmartPlugin.class);
        registerPlugin(EdunixoPushPlugin.class);
        registerPlugin(EdunixoSyncGuardianPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
