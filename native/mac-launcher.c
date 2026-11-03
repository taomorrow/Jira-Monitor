// Native app entry point. No shell evaluation, privileges, or security-policy changes.
#include <mach-o/dyld.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
int main(void) {
    char executable[PATH_MAX], resolved[PATH_MAX], resource[PATH_MAX], script[PATH_MAX];
    uint32_t size = sizeof(executable);
    if (_NSGetExecutablePath(executable, &size) != 0 || !realpath(executable, resolved)) return 1;
    char *slash = strrchr(resolved, '/');
    if (!slash) return 1;
    *slash = '\0';
    int resource_length = snprintf(resource, sizeof(resource), "%s/../../../Jira-Monitor-Schedule.sh", resolved);
    int script_length = snprintf(script, sizeof(script), "%s/../Resources/install.applescript", resolved);
    if (resource_length < 0 || (size_t)resource_length >= sizeof(resource)) return 1;
    if (script_length < 0 || (size_t)script_length >= sizeof(script)) return 1;
    if (setenv("JM_INSTALL_SCRIPT", resource, 1) != 0) return 1;
    execl("/usr/bin/osascript", "osascript", script, (char *)NULL);
    return 1;
}
