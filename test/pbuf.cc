#include <stdint.h>
#include <stdio.h>
#include <string>
#include <iostream>
#include <fstream>

using namespace std;

char* EncodeVarint64(char* dst, uint64_t v) {
  static const int B = 128;
  unsigned char* ptr = reinterpret_cast<unsigned char*>(dst);
  while (v >= B) {
    *(ptr++) = (v & (B-1)) | B;
    v >>= 7;
  }
  *(ptr++) = static_cast<unsigned char>(v);
  return reinterpret_cast<char*>(ptr);
}

void PutVarint64(std::string* dst, uint64_t v) {
  char buf[10];
  char* ptr = EncodeVarint64(buf, v);
  dst->append(buf, ptr - buf);
}

char* EncodeVarint32(char* dst, uint32_t v) {
  // Operate on characters as unsigneds
  unsigned char* ptr = reinterpret_cast<unsigned char*>(dst);
  static const int B = 128;
  if (v < (1<<7)) {
    *(ptr++) = v;
  } else if (v < (1<<14)) {
    *(ptr++) = v | B;
    *(ptr++) = v>>7;
  } else if (v < (1<<21)) {
    *(ptr++) = v | B;
    *(ptr++) = (v>>7) | B;
    *(ptr++) = v>>14;
  } else if (v < (1<<28)) {
    *(ptr++) = v | B;
    *(ptr++) = (v>>7) | B;
    *(ptr++) = (v>>14) | B;
    *(ptr++) = v>>21;
  } else {
    *(ptr++) = v | B;
    *(ptr++) = (v>>7) | B;
    *(ptr++) = (v>>14) | B;
    *(ptr++) = (v>>21) | B;
    *(ptr++) = v>>28;
  }
  return reinterpret_cast<char*>(ptr);
}

void PutVarint32(std::string* dst, uint32_t v) {
  char buf[5];
  char* ptr = EncodeVarint32(buf, v);
  dst->append(buf, ptr - buf);
}

void printVarint64(FILE *f, uint64_t orig) {
  std::string in;
  PutVarint64(&in, orig);
  fprintf(f, "%16llu%s", (long long unsigned int)orig, in.c_str());
}

void printVarint32(FILE *f, uint32_t orig) {
  std::string in;
  PutVarint32(&in, orig);
  fprintf(f, "%16lu%s", (long unsigned int)orig, in.c_str());
}

int main() {
  FILE *f;
  f = fopen("varint64.dat", "w");

  printVarint64(f, 9007199254740991ul); // maximum JavaScript integer
  printVarint64(f, 0x1ffffffffffffful); // maximum JavaScript integer
  printVarint64(f, 111111111111);
  printVarint64(f, 111111111);
  printVarint64(f, 11111);
  printVarint64(f, 1);
  printVarint64(f, 0xffffffffffffful);
  printVarint64(f, 0xfffffffffffful);
  printVarint64(f, 0xffffffffffful);
  printVarint64(f, 0xfffffffffful);
  printVarint64(f, 0xffffffffful);
  printVarint64(f, 0xfffffffful);
  printVarint64(f, 0xffffffful);
  printVarint64(f, 0xfffffful);
  printVarint64(f, 0xffffful);
  printVarint64(f, 0xfffful);
  printVarint64(f, 0xffful);
  printVarint64(f, 0xfful);
  printVarint64(f, 0xful);
  printVarint64(f, 0x5555555555555ul);
  printVarint64(f, 0x555555555555ul);
  printVarint64(f, 0x55555555555ul);
  printVarint64(f, 0x5555555555ul);
  printVarint64(f, 0x555555555ul);
  printVarint64(f, 0x55555555ul);
  printVarint64(f, 0x5555555ul);
  printVarint64(f, 0x555555ul);
  printVarint64(f, 0x55555ul);
  printVarint64(f, 0x5555ul);
  printVarint64(f, 0x555ul);
  printVarint64(f, 0x55ul);
  printVarint64(f, 0x5ul);

  fclose(f);

  f = fopen("varint32.dat", "w");

  printVarint32(f, 0x7ffffffful); // max 32-bit int
  printVarint32(f, 111111111);
  printVarint32(f, 11111);
  printVarint32(f, 1);
  printVarint32(f, 0xffffffful);
  printVarint32(f, 0xfffffful);
  printVarint32(f, 0xffffful);
  printVarint32(f, 0xfffful);
  printVarint32(f, 0xffful);
  printVarint32(f, 0xfful);
  printVarint32(f, 0xful);
  printVarint32(f, 0x55555555ul);
  printVarint32(f, 0x5555555ul);
  printVarint32(f, 0x555555ul);
  printVarint32(f, 0x55555ul);
  printVarint32(f, 0x5555ul);
  printVarint32(f, 0x555ul);
  printVarint32(f, 0x55ul);
  printVarint32(f, 0x5ul);

  fclose(f);
}