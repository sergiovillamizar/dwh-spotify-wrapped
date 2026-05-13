terraform {
  backend "gcs" {
    bucket = "spotify-wrapped-tfstate"
    prefix = "terraform/state"
  }
}
