#!/usr/bin/env bash

# Configure multipass to use the libvirt driver:
#
# sudo apt install libvirt-daemon-system
# sudo snap connect multipass:libvirt
# sudo multipass set local.driver=libvirt


multipass launch \
    --cpus 8 \
    --disk 100G \
    --mem 6G \
    --name github-duckdb-wasm-ci \
    --cloud-init ./cloud-init.yaml

