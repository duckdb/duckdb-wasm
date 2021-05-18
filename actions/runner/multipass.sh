#!/usr/bin/env bash

# Configure multipass to use the libvirt driver:
#
# sudo apt install libvirt-daemon-system
# sudo snap connect multipass:libvirt
# sudo multipass set local.driver=libvirt
#
# Let the cloud-init setup your vm, afterwards do the following steps:
#   * Su actions and register the runner in /home/actions/runner
#   * Install the action runner as root via /home/actions/runner/svc.sh install actions
#   * Providing the user actions to svc.sh install is crucial since the service needs the correct permissions!


multipass launch \
    --cpus 8 \
    --disk 100G \
    --mem 6G \
    --name github-duckdb-wasm-ci \
    --cloud-init ./cloud-init.yaml

