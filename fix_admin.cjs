const fs = require('fs');
let code = fs.readFileSync('src/app/pages/Admin.tsx', 'utf8');
const block = fs.readFileSync('temp_block.txt', 'utf8');

// 1. Change useAuth
code = code.replace('const { logout } = useAuth();', 'const { user, logout } = useAuth();');

// 2. Remove the block from its current position
// The block has exactly what's in temp_block.txt. Let's make sure it matches.
// We can use string replacement.
if (!code.includes(block)) {
    console.log("Could not find exact block to remove");
    process.exit(1);
}
code = code.replace(block, '');

// 3. Insert the block after the Settings tab ends.
// Let's find the end of the Settings tab.
const settingsEndStr = `              <div className="flex justify-end">
                <Button onClick={handleSettingsSave}>Save Settings</Button>
              </div>
            </div>
          )}`;
if (!code.includes(settingsEndStr)) {
    console.log("Could not find settings end");
    process.exit(1);
}
code = code.replace(settingsEndStr, settingsEndStr + '\n\n' + block);

fs.writeFileSync('src/app/pages/Admin.tsx', code);
console.log("Fix applied successfully");
