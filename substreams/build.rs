fn main() {
    println!("cargo:rerun-if-changed=proto");
    buffa_build::Config::new()
        .files(&["proto/ekubo/v3/events.proto"])
        .includes(&["proto"])
        .include_file("pb.rs")
        .compile()
        .expect("compile protobuf");
}
